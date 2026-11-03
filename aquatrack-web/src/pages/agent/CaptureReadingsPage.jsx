import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CircleCheck,
  CloudOff,
  Droplets,
  Gauge,
  Home,
  Loader2,
  MapPin,
  RefreshCw,
  TriangleAlert,
  User,
  Wifi,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
// Consumption above this many units gets a "please re-check the meter" warning.
const HIGH_USAGE_UNITS = 100;

// Sample data. Replace with a Supabase fetch of the `households` table.
// Same shape as the list on the Households page, plus owner and previousReading.
const SAMPLE_HOUSEHOLDS = {
  1: {
    id: '1',
    name: 'Sample household 1',
    owner: 'Sample Owner',
    area: 'Section 58, Nakuru',
    meterNo: 'M-0001',
    previousReading: 1250,
  },
};

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
  const { error: insertError } = await supabase.from('meter_readings').insert({
    household_id: reading.householdId,
    reading_value: reading.readingValue,
    billing_period: reading.billingPeriod,
    status: flagged ? 'flagged_duplicate' : 'pending_review',
    captured_by: userId,
  });
  if (insertError) throw insertError;
  return { flagged };
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

  const household = SAMPLE_HOUSEHOLDS[householdId];
  const billingPeriod = useMemo(currentBillingPeriod, []);

  const [reading, setReading] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // { mode: 'synced' | 'queued', flagged, value, consumption }
  const [pendingCount, setPendingCount] = useState(() => getQueue().length);

  const tabs = [
    { label: 'Households', to: a.home, icon: Home, end: true },
    { label: 'Sync queue', to: a.queue, icon: RefreshCw },
    { label: 'Profile', to: a.profile, icon: User },
  ];

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
  // Called as a plain function (not <Shell />) so the form keeps focus while typing.
  function renderShell(children) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 sm:shadow-xl">
          <header className="bg-navy-900 px-5 pb-16 pt-6 text-white">
            <div className="flex items-center justify-between">
              <Link
                to={a.home}
                className="inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-brand-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ArrowLeft className="size-4" />
                Households
              </Link>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  online ? 'bg-ok-50 text-ok-600' : 'bg-warn-50 text-warn-700'
                }`}
              >
                {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1.5" />
              <div className="leading-tight">
                <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
                <p className="text-xs text-brand-200">Capture reading</p>
              </div>
            </div>
          </header>

          <main className="-mt-8 flex-1 rounded-t-3xl bg-slate-50 px-5 pb-28 pt-6">{children}</main>

          <nav
            aria-label="Main"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
          >
            <ul className="mx-auto grid max-w-md grid-cols-3">
              {tabs.map(({ label, to, icon: Icon, end }) => (
                <li key={label}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-600 ${
                        isActive || (label === 'Households' && !end)
                          ? 'text-brand-600'
                          : 'text-slate-500 hover:text-navy-900'
                      }`
                    }
                  >
                    <Icon className="size-5" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    );
  }

  // ---- Household not found --------------------------------------------------
  if (!household) {
    return renderShell(
      <>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Household not found</h1>
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
      <>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <span
            className={`mx-auto grid size-14 place-items-center rounded-full ${
              queued ? 'bg-warn-50 text-warn-700' : 'bg-ok-50 text-ok-600'
            }`}
          >
            {queued ? <CloudOff className="size-7" /> : <CircleCheck className="size-7" />}
          </span>
          <h1 className="mt-4 text-xl font-extrabold tracking-tight text-navy-900">
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
        </div>
      </>,
    );
  }

  // ---- Capture form ---------------------------------------------------------
  return renderShell(
    <>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Capture reading</h1>
      <p className="mt-1 text-sm text-slate-500">Billing period: {formatPeriod(billingPeriod)}</p>

      {/* Offline notice */}
      {!online && (
        <div
          role="status"
          className="mt-4 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700"
        >
          <CloudOff className="mt-0.5 size-4 shrink-0" />
          <p>
            You’re offline. Readings are saved on this phone and sync automatically when the connection returns.
            {pendingCount > 0 && ` ${pendingCount} waiting to sync.`}
          </p>
        </div>
      )}

      {/* Household card */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
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
          className="mt-4 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            A reading for this household has already been captured this month. You can still submit, but it will
            be flagged as a possible duplicate.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
    </>,
  );
}