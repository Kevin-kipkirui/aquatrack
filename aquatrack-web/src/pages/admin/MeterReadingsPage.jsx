import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDown,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Search,
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
// Config and helpers
// ---------------------------------------------------------------------------
// In development, show sample figures when the database call fails so the layout
// can be judged. Never shown in production builds.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const SAMPLE = {
  period: '2026-11',
  periods: ['2026-11', '2026-10', '2026-09'],
  counts: { all: 6, flagged: 2, pending: 2, approved: 2 },
  readings: [
    { id: '1', household: 'NRA-0056', owner: 'Samuel Kiprop', officer: 'B. Kiplangat', reading: 176.4, previous: 158.8, status: 'flagged_duplicate', capturedAt: '2026-11-02T08:14:00Z' },
    { id: '2', household: 'NRA-0117', owner: 'Grace Wanjiku', officer: 'B. Kiplangat', reading: 205.3, previous: 193.2, status: 'flagged_duplicate', capturedAt: '2026-11-01T15:40:00Z' },
    { id: '3', household: 'NRA-0084', owner: 'Peter Kamau', officer: 'F. Otieno', reading: 98.7, previous: 104.1, status: 'pending_review', capturedAt: '2026-11-02T10:05:00Z' },
    { id: '4', household: 'NRA-0302', owner: 'Esther Njeri', officer: 'M. Wanjiru', reading: 143.9, previous: 131.0, status: 'pending_review', capturedAt: '2026-11-02T09:22:00Z' },
    { id: '5', household: 'NRA-0231', owner: 'James Mwangi', officer: 'F. Otieno', reading: 191.6, previous: 184.2, status: 'approved', capturedAt: '2026-11-01T11:30:00Z' },
    { id: '6', household: 'NRA-0198', owner: 'Mercy Achieng', officer: 'M. Wanjiru', reading: 142.0, previous: 127.8, status: 'approved', capturedAt: '2026-11-01T09:12:00Z' },
  ],
};

const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('en-KE');

function formatPeriod(value) {
  if (!value) return '—';
  const date = new Date(`${value}-01`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

function formatCaptured(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const STATUS_BADGES = {
  approved: { label: 'Approved', className: 'bg-ok-50 text-ok-700' },
  pending_review: { label: 'Pending review', className: 'bg-warn-50 text-warn-700' },
  flagged_duplicate: { label: 'Flagged duplicate', className: 'bg-bad-50 text-bad-700' },
};

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function MeterReadingsPage() {
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [requestedPeriod, setRequestedPeriod] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data: result, error: rpcError } = await supabase.rpc('readings_overview', {
      p_period: requestedPeriod || null,
    });
    if (rpcError) {
      setData(null);
      setError(rpcError.message);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [requestedPeriod]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filter, query, requestedPeriod]);

  const usingSample = !data && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const overview = data ?? (usingSample ? SAMPLE : null);

  const readings = useMemo(() => overview?.readings ?? [], [overview]);
  const counts = overview?.counts ?? { all: 0, flagged: 0, pending: 0, approved: 0 };
  const needReview = counts.flagged + counts.pending;

  const tabs = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'flagged_duplicate', label: 'Flagged', count: counts.flagged },
    { key: 'pending_review', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
  ];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return readings.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!q) return true;
      return `${r.household} ${r.owner ?? ''} ${r.officer ?? ''}`.toLowerCase().includes(q);
    });
  }, [readings, filter, query]);

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
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
                Meter readings
                {overview?.period && (
                  <span className="font-semibold text-slate-400"> · {formatPeriod(overview.period)}</span>
                )}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Readings captured by field agents. Approving a reading generates its bill.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="period" className="sr-only">Billing period</label>
              <select
                id="period"
                value={overview?.period ?? ''}
                onChange={(e) => setRequestedPeriod(e.target.value)}
                disabled={!overview?.periods?.length}
                className="rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
              >
                {(overview?.periods ?? []).map((p) => (
                  <option key={p} value={p}>{formatPeriod(p)}</option>
                ))}
                {!overview?.periods?.length && <option value="">No periods yet</option>}
              </select>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm hover:bg-brand-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Status messages */}
          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load meter readings</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only)
            </p>
          )}

          {/* Needs-attention banner */}
          {!loading && needReview > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-warn-700">
              <span className="flex items-center gap-3 text-sm">
                <AlertTriangle className="size-5 shrink-0" />
                <span>
                  <strong>
                    {countFormat.format(needReview)} {needReview === 1 ? 'reading needs' : 'readings need'} review.
                  </strong>{' '}
                  {counts.flagged > 0 && 'Flagged duplicates are held back from billing until resolved.'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setFilter(counts.flagged > 0 ? 'flagged_duplicate' : 'pending_review')}
                className="inline-flex items-center gap-1 text-sm font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn-600"
              >
                Show them <ChevronRight className="size-4" />
              </button>
            </div>
          )}

          {/* Table card */}
          <section aria-labelledby="readings-heading" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="readings-heading" className="sr-only">Readings for the selected billing period</h2>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Filter by status" className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
                {tabs.map(({ key, label, count }) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={filter === key}
                    onClick={() => setFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-brand-600 ${
                      filter === key ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy-900'
                    }`}
                  >
                    {label} <span className="text-xs font-medium text-slate-400">{count}</span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-72">
                <label htmlFor="search" className="sr-only">Search readings</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search household, owner or officer"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>
            </div>

            {loading ? (
              <div className="mt-5 space-y-3" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-brand-50" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-5 grid h-60 place-items-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-6 text-center">
                <div>
                  {readings.length > 0 && filter === 'flagged_duplicate' && !query ? (
                    <CheckCircle2 className="mx-auto size-8 text-ok-600" />
                  ) : (
                    <FileSearch className="mx-auto size-8 text-brand-200" />
                  )}
                  <p className="mt-2 text-sm text-slate-500">
                    {readings.length === 0
                      ? 'No readings for this period yet. They appear here as field agents capture them.'
                      : filter === 'flagged_duplicate' && !query
                        ? 'No flagged duplicates. Nothing is being held back from billing.'
                        : 'No readings match this filter.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[44rem] text-left text-sm">
                    <caption className="sr-only">Meter readings, flagged and pending first</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th scope="col" className="py-2 pr-3 font-semibold">Household</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Reading (m³)</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Consumption</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Captured by</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                        <th scope="col" className="py-2"><span className="sr-only">Open reading</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.slice(0, visible).map((r) => {
                        const badge = STATUS_BADGES[r.status] ?? {
                          label: r.status,
                          className: 'bg-slate-100 text-slate-600',
                        };
                        const reading = Number(r.reading);
                        const hasPrevious = r.previous !== null && r.previous !== undefined;
                        const previous = Number(r.previous);
                        const decreased = hasPrevious && reading < previous;
                        const consumption = hasPrevious ? Math.max(reading - previous, 0) : null;
                        const needsAction = r.status !== 'approved';

                        return (
                          <tr key={r.id} className="hover:bg-brand-50/60">
                            <td className="py-3 pr-3">
                              <Link
                                to={a.readingReview(r.id)}
                                className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                              >
                                {r.household}
                              </Link>
                              {r.owner && <p className="text-xs text-slate-500">{r.owner}</p>}
                            </td>
                            <td className="py-3 pr-3 text-right tabular-nums">{units.format(reading)}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">
                              {consumption === null ? (
                                <span className="text-slate-400">—</span>
                              ) : decreased ? (
                                <span
                                  title={`Lower than the previous reading (${units.format(previous)}). Billed as 0.`}
                                  className="inline-flex items-center justify-end gap-1 font-semibold text-bad-700"
                                >
                                  <ArrowDown className="size-3.5" />
                                  Lower than previous
                                </span>
                              ) : (
                                `${units.format(consumption)} m³`
                              )}
                            </td>
                            <td className="py-3 pr-3">
                              <p className="text-slate-700">{r.officer || '—'}</p>
                              <p className="text-xs text-slate-500">{formatCaptured(r.capturedAt)}</p>
                            </td>
                            <td className="py-3 pr-3">
                              <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                                {badge.label}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <Link
                                to={a.readingReview(r.id)}
                                aria-label={`${needsAction ? 'Review' : 'View'} reading for ${r.household}`}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                                  needsAction
                                    ? 'bg-brand-600 text-white hover:bg-navy-900'
                                    : 'border border-brand-100 text-navy-900 hover:bg-brand-50'
                                }`}
                              >
                                {needsAction ? 'Review' : 'View'}
                                <ChevronRight className="size-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing {Math.min(visible, filtered.length)} of {filtered.length}
                  </span>
                  {visible < filtered.length && (
                    <button
                      type="button"
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="rounded-lg border border-brand-100 bg-white px-3 py-1.5 text-sm font-semibold text-navy-900 hover:bg-brand-50"
                    >
                      Show more
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}