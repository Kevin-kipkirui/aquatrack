import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CircleCheck,
  CloudOff,
  Droplets,
  Gauge,
  Home,
  Loader2,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import { fetchAgentHouseholds, getCachedHouseholds } from '../../lib/agentHouseholds';
import AgentLayout from './Agentlayout';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Consumption above this many units gets a "please re-check the meter" warning.
const HIGH_USAGE_UNITS = 100;

// ---------------------------------------------------------------------------
// Local-first storage (the "sync queue" described in the system design).
// When you build the Sync queue page, move these helpers into src/lib/syncQueue.js
// so both pages share them.
// ---------------------------------------------------------------------------
const QUEUE_KEY = 'aquatrack.syncQueue';
const CACHE_KEY = 'aquatrack.capturedReadings';

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the reading is still handled in memory for this visit.
  }
}

const getQueue = () => readStore(QUEUE_KEY, []);
const getCache = () => readStore(CACHE_KEY, {});

function currentBillingPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // e.g. 2026-11
}

function formatPeriod(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

// Sends one reading to Supabase. Column names follow the meter_readings table in the
// system documentation; adjust them here if your table differs.
// The server rule (section 3.3.3): a second reading for the same household and period
// is still stored, but with status 'flagged_duplicate' instead of 'pending_review'.
async function sendReading(reading, userId) {
  const { data: existing, error: lookupError } = await supabase
    .from('meter_readings')
    .select('id')
    .eq('household_id', reading.householdId)
    .eq('billing_period', reading.billingPeriod)
    .limit(1);
  if (lookupError) throw lookupError;

  const flagged = (existing?.length ?? 0) > 0;
  const { data: inserted, error: insertError } = await supabase
    .from('meter_readings')
    .insert({
      household_id: reading.householdId,
      reading_value: reading.readingValue,
      billing_period: reading.billingPeriod,
      status: flagged ? 'flagged_duplicate' : 'pending_review',
      captured_by: userId,
    })
    .select('status')
    .single();
  if (insertError) throw insertError;
  // The database also flags duplicates from other agents, which this agent cannot see.
  return { flagged: flagged || inserted?.status === 'flagged_duplicate' };
}

// Shape the capture screen expects.
function toCaptureShape(h) {
  return {
    id: h.id,
    name: [h.houseNumber, h.area].filter(Boolean).join(', ') || h.code || h.owner,
    owner: h.owner,
    area: [h.area, h.constituency].filter(Boolean).join(', '),
    meterNo: h.meterNo,
    previousReading: Number(h.previousReading ?? 0),
  };
}

function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network') || err?.status === 0;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CaptureReadingPage() {
  const { householdId } = useParams();
  const a = ROUTES.agent;
  const { user } = useAuth();
  const online = useOnlineStatus();

  // Same list the Households page uses: cached on the phone, refreshed when online.
  const [household, setHousehold] = useState(() => {
    const found = getCachedHouseholds().find((h) => h.id === householdId);
    return found ? toCaptureShape(found) : null;
  });
  const [lookingUp, setLookingUp] = useState(!household);

  useEffect(() => {
    if (household || !online) {
      setLookingUp(false);
      return undefined;
    }
    let cancelled = false;
    fetchAgentHouseholds()
      .then((list) => {
        const found = list.find((h) => h.id === householdId);
        if (!cancelled && found) setHousehold(toCaptureShape(found));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLookingUp(false);
      });
    return () => {
      cancelled = true;
    };
  }, [householdId, household, online]);
  const billingPeriod = useMemo(currentBillingPeriod, []);

  const [reading, setReading] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { mode: 'synced' | 'queued', flagged, value, consumption }
  const [pendingCount, setPendingCount] = useState(() => getQueue().length);

  // ---- Live calculations ----------------------------------------------------
  const value = reading === '' ? null : Number(reading);
  const hasValue = value !== null && Number.isFinite(value);
  const previous = household?.previousReading ?? 0;
  const consumption = hasValue ? value - previous : null;
  const billedUnits = consumption === null ? null : Math.max(consumption, 0);

  // Duplicate check against the local cache and the offline queue, before submitting.
  const alreadyCaptured = useMemo(() => {
    if (!household) return false;
    const key = `${household.id}|${billingPeriod}`;
    if (getCache()[key]) return true;
    return getQueue().some((q) => q.householdId === household.id && q.billingPeriod === billingPeriod);
  }, [household, billingPeriod, result]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!hasValue) {
      setError('Enter the number shown on the meter.');
      return;
    }
    if (value < 0) {
      setError('A meter reading cannot be negative.');
      return;
    }

    const record = {
      localId: crypto.randomUUID(),
      householdId: household.id,
      readingValue: value,
      billingPeriod,
      capturedAt: new Date().toISOString(),
      status: 'queued',
    };

    setSubmitting(true);
    try {
      let outcome;
      if (online) {
        try {
          const { flagged } = await sendReading(record, user?.id);
          outcome = { mode: 'synced', flagged: flagged || alreadyCaptured };
        } catch (err) {
          if (!isNetworkError(err)) throw err;
          outcome = { mode: 'queued', flagged: alreadyCaptured }; // connection dropped mid-send
        }
      } else {
        outcome = { mode: 'queued', flagged: alreadyCaptured };
      }

      if (outcome.mode === 'queued') {
        const queue = [...getQueue(), record];
        writeStore(QUEUE_KEY, queue);
        setPendingCount(queue.length);
      }
      writeStore(CACHE_KEY, { ...getCache(), [`${household.id}|${billingPeriod}`]: record.capturedAt });

      setResult({ ...outcome, value, consumption: billedUnits });
    } catch (err) {
      setError(err?.message || 'Could not save the reading. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ---- Shared shell ---------------------------------------------------------
  // AgentLayout lives outside this component, so the form keeps focus while typing.
  function renderShell(children) {
    return (
      <AgentLayout
        active="households"
        back={{ to: a.home, label: 'Households' }}
        online={online}
        subtitle="Capture reading"
      >
        {children}
      </AgentLayout>
    );
  }

  // ---- Household not found --------------------------------------------------
  if (!household && lookingUp) {
    return renderShell(
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Loading household…
      </p>,
    );
  }

  if (!household) {
    return renderShell(
      <>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Household not found</h1>
        <p className="mt-1 text-sm text-slate-500">We couldn’t find household “{householdId}”.</p>
        <Link
          to={a.home}
          className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-navy-900"
        >
          Back to households
        </Link>
      </>,
    );
  }

  // ---- Success --------------------------------------------------------------
  if (result) {
    const queued = result.mode === 'queued';
    return renderShell(
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm lg:mt-4 lg:p-10">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${
            queued ? 'bg-warn-50 text-warn-700' : 'bg-ok-50 text-ok-600'
          }`}
        >
          {queued ? <CloudOff className="size-7" /> : <CircleCheck className="size-7" />}
        </span>
        <h1 className="mt-4 text-xl font-extrabold tracking-tight text-navy-900 lg:text-2xl">
          {queued ? 'Saved on this phone' : 'Reading submitted'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {queued
            ? 'No connection right now. The reading is queued and will sync automatically when you’re back online.'
            : 'The reading has been sent to the association for review.'}
        </p>

        <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-brand-100 bg-brand-50 text-left">
          {[
            ['Household', household.name],
            ['Reading', result.value.toLocaleString()],
            ['Consumption', `${result.consumption.toLocaleString()} units`],
          ].map(([label, v]) => (
            <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="truncate text-sm font-semibold text-navy-900">{v}</dd>
            </div>
          ))}
        </dl>

        {result.flagged && (
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-left text-sm text-warn-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              A reading for this household was already captured this month. This one is flagged as a
              possible duplicate for an administrator to review.
            </p>
          </div>
        )}

        <Link
          to={a.home}
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-3.5 text-base font-bold text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          Next household
        </Link>
        {queued && (
          <Link to={a.queue} className="mt-3 block text-sm font-semibold text-brand-600 hover:text-navy-900">
            View sync queue ({pendingCount} waiting)
          </Link>
        )}
      </div>,
    );
  }

  // ---- Capture form ---------------------------------------------------------
  return renderShell(
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Capture reading</h1>
      <p className="mt-1 text-sm text-slate-500">Billing period: {formatPeriod(billingPeriod)}</p>

      {/* Phones: one column. Desktop: household info on the left, form on the right. */}
      <div className="mt-4 lg:mt-8 lg:grid lg:grid-cols-5 lg:items-start lg:gap-8">
        <div className="space-y-4 lg:col-span-2">
          {/* Offline notice */}
          {!online && (
            <div
              role="status"
              className="flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700"
            >
              <CloudOff className="mt-0.5 size-4 shrink-0" />
              <p>
                You’re offline. Readings are saved on this phone and sync automatically when the connection
                returns.
                {pendingCount > 0 && ` ${pendingCount} waiting to sync.`}
              </p>
            </div>
          )}

          {/* Household card */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Home className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-navy-900">{household.name}</p>
              <p className="truncate text-xs text-slate-500">Owner: {household.owner}</p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                <MapPin className="size-3.5 shrink-0" />
                {household.area} · {household.meterNo}
              </p>
            </div>
          </div>

          {/* Duplicate warning */}
          {alreadyCaptured && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>
                A reading for this household has already been captured this month. You can still submit, but it
                will be flagged as a possible duplicate.
              </p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4 lg:col-span-3 lg:mt-0">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-8">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Previous reading</span>
              <span className="text-lg font-bold text-navy-900">{previous.toLocaleString()}</span>
            </div>

            <label htmlFor="reading" className="mt-4 block text-sm font-semibold text-navy-900">
              Current reading
            </label>
            <div className="relative mt-1.5">
              <Gauge className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                id="reading"
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                autoComplete="off"
                required
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder="Number on the meter"
                className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-4 text-xl font-bold text-slate-900 placeholder:text-base placeholder:font-normal placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
              />
            </div>

            {/* Consumption */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-600">
                <Droplets className="size-4 text-brand-600" />
                Consumption
              </span>
              <span className="text-lg font-extrabold text-navy-900">
                {billedUnits === null ? '—' : `${billedUnits.toLocaleString()} units`}
              </span>
            </div>

            {consumption !== null && consumption < 0 && (
              <p className="mt-3 flex items-start gap-2 text-xs text-warn-700">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                This is lower than the previous reading. It will count as 0 units. Check the meter digits before
                submitting.
              </p>
            )}
            {consumption !== null && consumption > HIGH_USAGE_UNITS && (
              <p className="mt-3 flex items-start gap-2 text-xs text-warn-700">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                This is unusually high usage. Please re-check the meter before submitting.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !hasValue}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-navy-900 active:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {submitting && <Loader2 className="size-5 animate-spin" />}
            {submitting ? 'Submitting…' : online ? 'Submit reading' : 'Save reading offline'}
          </button>
        </form>
      </div>
    </>,
  );
}