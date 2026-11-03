import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  CircleCheck,
  CircleX,
  FileSearch,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  Settings,
  TriangleAlert,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

function formatPeriod(value) {
  if (!value) return '—';
  const raw = String(value);
  const date = new Date(raw.length === 7 ? `${raw}-01` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGES = {
  approved: { label: 'Approved', className: 'bg-ok-50 text-ok-700' },
  pending_review: { label: 'Pending review', className: 'bg-warn-50 text-warn-700' },
  flagged_duplicate: { label: 'Flagged duplicate', className: 'bg-bad-50 text-bad-700' },
  rejected: { label: 'Rejected', className: 'bg-slate-100 text-slate-600' },
};

function badgeFor(status) {
  return STATUS_BADGES[status] ?? { label: status ?? '—', className: 'bg-slate-100 text-slate-600' };
}

// Small helper used only inside this file.
function ReadingCard({ title, highlight, reading }) {
  const badge = badgeFor(reading.status);
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? 'border-brand-600 bg-brand-50 ring-4 ring-brand-100' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-500">{title}</p>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>{badge.label}</span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-navy-900">
        {units.format(Number(reading.value))}
        <span className="ml-1 text-base font-semibold text-slate-400">m³</span>
      </p>
      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Captured by</dt>
          <dd className="font-medium text-navy-900">{reading.officer || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Captured</dt>
          <dd className="font-medium text-navy-900">{formatDateTime(reading.capturedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReadingReviewPage() {
  const { readingId } = useParams();
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  const [confirming, setConfirming] = useState(null); // 'approve' | 'reject' | null
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [flash, setFlash] = useState('');

  const adminName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator';

  const navItems = [
    { label: 'Dashboard', to: a.dashboard, icon: LayoutDashboard },
    { label: 'Meter Readings', to: a.readings, icon: Gauge },
    { label: 'Households', to: a.households, icon: Home },
    { label: 'Billing & Payments', to: a.billing, icon: Receipt },
    { label: 'Reports & Analytics', to: a.reports, icon: BarChart3 },
    { label: 'User Management', to: a.users, icon: Users },
    { label: 'Recruit Field Agent', to: a.recruitAgent, icon: UserPlus },
    { label: 'Settings', to: a.settings, icon: Settings },
  ];

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError('');
      setNotFound(false);
      const { data: result, error: rpcError } = await supabase.rpc('reading_review_get', {
        p_reading_id: readingId,
      });
      if (rpcError) {
        setData(null);
        if (rpcError.code === 'P0002' || /not found/i.test(rpcError.message)) setNotFound(true);
        else setError(rpcError.message);
      } else {
        setData(result);
      }
      setLoading(false);
    },
    [readingId]
  );

  useEffect(() => {
    setFlash('');
    setConfirming(null);
    setActionError('');
    load();
  }, [load]);

  async function runAction(action) {
    setActing(true);
    setActionError('');
    const { error: rpcError } = await supabase.rpc('review_reading', {
      p_reading_id: readingId,
      p_action: action,
    });
    setActing(false);
    if (rpcError) {
      setActionError(rpcError.message);
      return;
    }
    setConfirming(null);
    setFlash(
      action === 'approve'
        ? 'Reading approved and the bill has been generated.'
        : 'Reading rejected. No bill was created.'
    );
    await load({ silent: true });
  }

  // ---- Derived figures ----
  const reading = data?.reading;
  const others = data?.others ?? [];
  const history = data?.history ?? [];
  const rate = data?.billingRate == null ? null : Number(data.billingRate);
  const current = Number(reading?.value ?? 0);
  const previous = Number(data?.previousReading ?? 0);
  const rawConsumption = current - previous;
  const decreased = rawConsumption < 0;
  const billedConsumption = Math.max(rawConsumption, 0);
  const previewAmount = rate == null ? null : billedConsumption * rate;

  const usedValues = history.map((h) => Number(h.used)).filter((n) => n > 0);
  const average = usedValues.length ? usedValues.reduce((s, n) => s + n, 0) / usedValues.length : 0;
  const unusuallyHigh = usedValues.length >= 2 && average > 0 && rawConsumption > average * 2;

  const isOpen = reading?.status === 'pending_review' || reading?.status === 'flagged_duplicate';
  const isDuplicate = reading?.status === 'flagged_duplicate' || others.length > 0;
  const blockedByBilled = others.some((o) => o.billId);
  const status = badgeFor(reading?.status);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* ------------------------------ Mobile top bar ------------------------------ */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 text-white lg:hidden">
        <div className="flex items-center gap-2.5">
          <img src="/logo-mark.png" alt="" className="h-8 w-8 rounded-lg bg-white object-contain p-1" />
          <span className="text-base font-bold tracking-tight">AquaTrack</span>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Menu className="size-6" />
        </button>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* --------------------------------- Sidebar --------------------------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 text-white transition-transform duration-200 lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <div className="flex items-center gap-3">
            <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1.5" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
              <p className="text-xs text-brand-200">Nakuru Residents Assoc.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 hover:bg-navy-800 lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 overflow-y-auto px-3">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={label}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                }`
              }
            >
              <Icon className="size-[18px] shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <p className="text-xs text-brand-200">Signed in as</p>
          <p className="truncate text-sm font-semibold">{user?.email ?? adminName}</p>
          <p className="mb-3 text-xs text-slate-400">Administrator</p>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-800 px-3 py-2 text-sm font-medium hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* ---------------------------------- Main ---------------------------------- */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Link
            to={a.readings}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            <ArrowLeft className="size-4" />
            Back to readings
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
              Review reading{data ? ` · ${data.household?.code}` : ''}
            </h1>
            {reading && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
            )}
          </div>
          {data && (
            <p className="mt-1 text-sm text-slate-500">
              {[data.household?.owner, data.household?.section, formatPeriod(reading.billingPeriod)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}

          {/* ------------------------------- States ------------------------------- */}
          {loading && (
            <div className="mt-6 grid gap-6 xl:grid-cols-5" aria-busy="true">
              <div className="h-[30rem] animate-pulse rounded-2xl bg-brand-50 xl:col-span-3" />
              <div className="space-y-6 xl:col-span-2">
                <div className="h-56 animate-pulse rounded-2xl bg-brand-50" />
                <div className="h-48 animate-pulse rounded-2xl bg-brand-50" />
              </div>
            </div>
          )}

          {!loading && notFound && (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-200 bg-white p-10 text-center">
              <FileSearch className="mx-auto size-10 text-brand-200" />
              <h2 className="mt-3 text-lg font-bold text-navy-900">Reading not found</h2>
              <p className="mt-1 text-sm text-slate-500">This reading doesn’t exist, or it was removed.</p>
              <Link
                to={a.readings}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900"
              >
                Back to readings
              </Link>
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load this reading</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* ------------------------------- Review ------------------------------- */}
          {!loading && data && (
            <>
              {flash && (
                <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-ok-600/20 bg-ok-50 p-4 text-sm text-ok-700">
                  <CircleCheck className="mt-0.5 size-4 shrink-0" />
                  <p className="font-semibold">{flash}</p>
                </div>
              )}

              {/* Warnings */}
              {isOpen && (
                <div className="mt-6 space-y-3">
                  {isDuplicate && (
                    <div className="flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <strong>Duplicate entry.</strong> Another reading already exists for this household and billing
                        period. Compare them below and keep only one. A household is billed once per period.
                      </p>
                    </div>
                  )}
                  {decreased && (
                    <div className="flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <strong>Lower than the previous reading</strong> ({units.format(previous)} m³). Negative
                        consumption is never billed, so approving this would create a KES 0 bill. Check the meter and
                        the figure first.
                      </p>
                    </div>
                  )}
                  {unusuallyHigh && (
                    <div className="flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                      <p>
                        <strong>Unusually high consumption.</strong> {units.format(rawConsumption)} m³ is more than
                        double this household’s recent average of {units.format(average)} m³. Make sure it isn’t a typing
                        mistake or a leak.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 grid gap-6 xl:grid-cols-5">
                {/* ----------------------------- Left column ----------------------------- */}
                <div className="space-y-6 xl:col-span-3">
                  <section aria-labelledby="compare-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 id="compare-heading" className="text-base font-bold text-navy-900">
                      {others.length > 0 ? 'This reading vs existing reading' : 'Submitted reading'}
                    </h2>

                    <div className={`mt-4 grid gap-4 ${others.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                      <ReadingCard title="This reading" highlight reading={reading} />
                      {others.map((o) => (
                        <ReadingCard key={o.id} title="Existing reading" reading={o} />
                      ))}
                    </div>

                    {others.length > 0 && (
                      <p className="mt-4 text-sm text-slate-600">
                        The two values differ by{' '}
                        <strong className="text-navy-900">
                          {units.format(Math.abs(current - Number(others[0].value)))} m³
                        </strong>
                        .
                        {blockedByBilled && ' The existing reading has already been billed, so it can’t be replaced.'}
                      </p>
                    )}
                  </section>

                  <section aria-labelledby="calc-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 id="calc-heading" className="text-base font-bold text-navy-900">
                      {reading.status === 'approved' ? 'How the bill was calculated' : 'What the bill would be'}
                    </h2>
                    <dl className="mt-4 divide-y divide-slate-100 text-sm">
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Previous reading</dt>
                        <dd className="font-medium tabular-nums text-navy-900">{units.format(previous)} m³</dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">This reading</dt>
                        <dd className="font-medium tabular-nums text-navy-900">{units.format(current)} m³</dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Consumption</dt>
                        <dd className="font-semibold tabular-nums text-navy-900">
                          {units.format(billedConsumption)} m³
                          {decreased && <span className="ml-1.5 text-xs font-medium text-warn-700">(floored at 0)</span>}
                        </dd>
                      </div>
                      <div className="flex justify-between py-2.5">
                        <dt className="text-slate-500">Billing rate</dt>
                        <dd className="font-medium tabular-nums text-navy-900">
                          {rate == null ? 'Not configured' : `${kes.format(rate)} per unit`}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-navy-900 px-4 py-4 text-white">
                      <span className="text-sm font-semibold">Amount due</span>
                      <span className="text-2xl font-extrabold tabular-nums">
                        {previewAmount == null ? '—' : kes.format(previewAmount)}
                      </span>
                    </div>
                  </section>
                </div>

                {/* ----------------------------- Right column ----------------------------- */}
                <div className="space-y-6 xl:col-span-2">
                  <section aria-labelledby="decision-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 id="decision-heading" className="text-base font-bold text-navy-900">Decision</h2>

                    {actionError && (
                      <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-bad-50 p-3 text-sm text-bad-700">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        {actionError}
                      </p>
                    )}

                    {!isOpen ? (
                      <div className="mt-4">
                        <p className="text-sm text-slate-600">
                          {reading.status === 'approved'
                            ? 'This reading has been approved.'
                            : reading.status === 'rejected'
                              ? 'This reading was rejected and will not be billed.'
                              : 'This reading is closed.'}
                        </p>
                        {reading.billId && (
                          <Link
                            to={a.billDetail(reading.billId)}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                          >
                            <Receipt className="size-4" />
                            View the bill
                            <ArrowUpRight className="size-4" />
                          </Link>
                        )}
                      </div>
                    ) : confirming ? (
                      <div
                        className={`mt-4 rounded-xl border p-4 ${
                          confirming === 'approve' ? 'border-ok-600/25 bg-ok-50' : 'border-bad-600/25 bg-bad-50'
                        }`}
                      >
                        <p className={`text-sm font-semibold ${confirming === 'approve' ? 'text-ok-700' : 'text-bad-700'}`}>
                          {confirming === 'approve'
                            ? `Approve ${units.format(current)} m³ for ${data.household?.code}? A bill of ${
                                previewAmount == null ? '—' : kes.format(previewAmount)
                              } will be generated${others.some((o) => o.status !== 'approved' && o.status !== 'rejected') ? ', and the other reading for this period will be rejected' : ''}.`
                            : `Reject this reading for ${data.household?.code}? It will not be billed.`}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => runAction(confirming)}
                            disabled={acting}
                            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                              confirming === 'approve'
                                ? 'bg-ok-600 hover:bg-ok-700 focus-visible:outline-ok-600'
                                : 'bg-bad-600 hover:bg-bad-700 focus-visible:outline-bad-600'
                            }`}
                          >
                            {acting && <Loader2 className="size-4 animate-spin" />}
                            {acting ? 'Saving…' : confirming === 'approve' ? 'Yes, approve' : 'Yes, reject'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setConfirming(null); setActionError(''); }}
                            disabled={acting}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <p className="text-sm text-slate-600">
                          {isDuplicate
                            ? 'Keep this reading to bill it, or reject it and keep the existing one.'
                            : 'Approving this reading generates the household’s bill for the period.'}
                        </p>

                        {rate == null && (
                          <p className="rounded-lg bg-warn-50 p-3 text-sm text-warn-700">
                            No billing rate is configured yet, so a bill can’t be generated. Set one in{' '}
                            <Link to={a.settings} className="font-semibold underline">Settings</Link>.
                          </p>
                        )}
                        {blockedByBilled && (
                          <p className="rounded-lg bg-warn-50 p-3 text-sm text-warn-700">
                            The existing reading for this period has already been billed, so this one can only be rejected.
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() => { setConfirming('approve'); setActionError(''); }}
                          disabled={rate == null || blockedByBilled}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                        >
                          <Check className="size-4" />
                          {isDuplicate ? 'Keep this reading and bill it' : 'Approve and generate bill'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setConfirming('reject'); setActionError(''); }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-bad-600/30 bg-white px-4 py-3 text-sm font-bold text-bad-700 hover:bg-bad-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bad-600"
                        >
                          <CircleX className="size-4" />
                          Reject reading
                        </button>
                      </div>
                    )}
                  </section>

                  <section aria-labelledby="history-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <h2 id="history-heading" className="text-base font-bold text-navy-900">Recent approved readings</h2>
                    {history.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-500">
                        No earlier approved readings. This will be the household’s first bill.
                      </p>
                    ) : (
                      <>
                        <table className="mt-3 w-full text-left text-sm">
                          <caption className="sr-only">Previous approved readings for this household</caption>
                          <thead>
                            <tr className="border-b border-slate-200 text-xs text-slate-500">
                              <th scope="col" className="py-2 pr-3 font-semibold">Period</th>
                              <th scope="col" className="py-2 pr-3 text-right font-semibold">Reading</th>
                              <th scope="col" className="py-2 text-right font-semibold">Used</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {history.map((h) => (
                              <tr key={h.period}>
                                <td className="py-2 pr-3 text-slate-700">{formatPeriod(h.period)}</td>
                                <td className="py-2 pr-3 text-right tabular-nums">{units.format(Number(h.value))}</td>
                                <td className="py-2 text-right tabular-nums text-slate-700">
                                  {units.format(Math.max(Number(h.used), 0))} m³
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {average > 0 && (
                          <p className="mt-3 text-xs text-slate-500">
                            Average use: <strong className="text-navy-900">{units.format(average)} m³</strong> per period.
                          </p>
                        )}
                      </>
                    )}
                  </section>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}