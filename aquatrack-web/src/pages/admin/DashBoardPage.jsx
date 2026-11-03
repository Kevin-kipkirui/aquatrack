import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Settings,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// In development, show sample figures when the API is unreachable so the layout
// can be judged. Never shown in production builds.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const SAMPLE_SUMMARY = {
  registeredHouseholds: 482,
  readingsThisMonth: 1206,
  flaggedDuplicates: 7,
  pendingBills: 34,
  monthlyTrend: [
    { month: 'Jun', total: 3420 },
    { month: 'Jul', total: 3610 },
    { month: 'Aug', total: 3890 },
    { month: 'Sep', total: 3750 },
    { month: 'Oct', total: 4020 },
    { month: 'Nov', total: 4180 },
  ],
  recentReadings: [
    { id: '1', household: 'NRA-0231', officer: 'F. Otieno', reading: 191.6, status: 'approved' },
    { id: '2', household: 'NRA-0117', officer: 'B. Kiplangat', reading: 205.3, status: 'flagged_duplicate' },
    { id: '3', household: 'NRA-0084', officer: 'F. Otieno', reading: 98.7, status: 'pending_review' },
    { id: '4', household: 'NRA-0198', officer: 'M. Wanjiru', reading: 142.0, status: 'approved' },
    { id: '5', household: 'NRA-0056', officer: 'B. Kiplangat', reading: 176.4, status: 'pending_review' },
  ],
};

const STATUS_BADGES = {
  approved: { label: 'Approved', className: 'bg-ok-50 text-ok-700' },
  pending_review: { label: 'Pending review', className: 'bg-warn-50 text-warn-700' },
  flagged_duplicate: { label: 'Flagged duplicate', className: 'bg-bad-50 text-bad-700' },
};

const numberFormat = new Intl.NumberFormat('en-KE');

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const a = ROUTES.admin;
  const { user, session, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const adminName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Administrator';
  const monthLabel = new Date().toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

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

  const loadSummary = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/dashboard/summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`The server answered with status ${res.status}.`);
      setData(await res.json());
    } catch (err) {
      setData(null);
      setError(err.message || 'Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const usingSample = !data && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const summary = data ?? (usingSample ? SAMPLE_SUMMARY : null);

  const trend = summary?.monthlyTrend ?? [];
  const recent = summary?.recentReadings ?? [];
  const flagged = summary?.flaggedDuplicates ?? 0;
  const maxTrend = Math.max(...trend.map((t) => t.total), 1);

  const stats = [
    {
      label: 'Registered households',
      value: summary?.registeredHouseholds,
      icon: Home,
      to: a.households,
      valueClass: 'text-brand-600',
      chipClass: 'bg-brand-600 text-white',
    },
    {
      label: 'Readings this month',
      value: summary?.readingsThisMonth,
      icon: Gauge,
      to: a.readings,
      valueClass: 'text-ok-600',
      chipClass: 'bg-ok-600 text-white',
    },
    {
      label: 'Flagged duplicates',
      value: summary?.flaggedDuplicates,
      icon: AlertTriangle,
      to: a.readings,
      valueClass: 'text-warn-600',
      chipClass: 'bg-warn-600 text-white',
    },
    {
      label: 'Pending bills',
      value: summary?.pendingBills,
      icon: Receipt,
      to: a.billing,
      valueClass: 'text-bad-600',
      chipClass: 'bg-bad-600 text-white',
    },
  ];

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

      {/* ------------------------------ Mobile overlay ------------------------------ */}
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
          {/* Page header */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Welcome back, {adminName}</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
                Dashboard overview
                <span className="font-semibold text-slate-400"> · {monthLabel}</span>
              </h1>
            </div>
            <button
              type="button"
              onClick={loadSummary}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm hover:bg-brand-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Status messages */}
          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load the dashboard figures</p>
                <p>
                  {error} Check that the API is running and that VITE_API_BASE_URL is set, then
                  press Refresh.
                </p>
              </div>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the API is unavailable (development only)
            </p>
          )}

          {/* Needs-attention banner */}
          {flagged > 0 && (
            <Link
              to={a.readings}
              className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-warn-700 hover:border-warn-600/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-warn-600"
            >
              <span className="flex items-center gap-3 text-sm">
                <AlertTriangle className="size-5 shrink-0" />
                <span>
                  <strong>
                    {numberFormat.format(flagged)} {flagged === 1 ? 'reading needs' : 'readings need'} review.
                  </strong>{' '}
                  Duplicates are held back from billing until you resolve them.
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-sm font-semibold">
                Review now <ChevronRight className="size-4" />
              </span>
            </Link>
          )}

          {/* Stat cards */}
          <section aria-label="Key figures" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, icon: Icon, to, valueClass, chipClass }) => (
              <Link
                key={label}
                to={to}
                className="group rounded-2xl border border-brand-100 bg-brand-50 p-5 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-600">{label}</p>
                  <span className={`grid size-9 place-items-center rounded-xl ${chipClass}`}>
                    <Icon className="size-[18px]" />
                  </span>
                </div>
                {loading ? (
                  <div className="mt-4 h-9 w-24 animate-pulse rounded-lg bg-brand-100" />
                ) : (
                  <p className={`mt-3 text-4xl font-extrabold tracking-tight ${valueClass}`}>
                    {value == null ? '—' : numberFormat.format(value)}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-brand-600 opacity-80 group-hover:opacity-100">
                  View details <ArrowUpRight className="size-3.5" />
                </p>
              </Link>
            ))}
          </section>

          {/* Chart + recent readings */}
          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            {/* Consumption trend */}
            <section
              aria-labelledby="trend-heading"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3"
            >
              <div className="flex items-center justify-between">
                <h2 id="trend-heading" className="text-base font-bold text-navy-900">
                  Monthly consumption trend (m³)
                </h2>
                <Link
                  to={a.reports}
                  className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                >
                  Full report <ChevronRight className="size-4" />
                </Link>
              </div>

              {trend.length === 0 ? (
                <div className="mt-6 grid h-64 place-items-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-6 text-center text-sm text-slate-500">
                  No consumption data yet. Totals appear here once readings have been approved.
                </div>
              ) : (
                <div className="mt-6 flex gap-3">
                  <div className="flex h-64 flex-col justify-between pb-7 text-right text-xs text-slate-400">
                    <span>{numberFormat.format(maxTrend)}</span>
                    <span>{numberFormat.format(Math.round(maxTrend / 2))}</span>
                    <span>0</span>
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-x-0 top-0 h-[calc(16rem-1.75rem)]">
                      <div className="absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
                      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                      <div className="absolute inset-x-0 bottom-0 border-t border-slate-200" />
                    </div>
                    <div className="relative flex h-64 items-end gap-2 sm:gap-4">
                      {trend.map((t, i) => {
                        const isLatest = i === trend.length - 1;
                        const pct = Math.max((t.total / maxTrend) * 100, 2);
                        return (
                          <div key={t.month} className="flex h-full flex-1 flex-col justify-end">
                            <div className="flex flex-1 flex-col justify-end pb-0">
                              <span className="mb-1 text-center text-xs font-semibold text-navy-900">
                                {numberFormat.format(t.total)}
                              </span>
                              <div
                                title={`${t.month}: ${numberFormat.format(t.total)} m³`}
                                style={{ height: `${pct * 0.82}%` }}
                                className={`w-full rounded-t-lg transition-colors ${
                                  isLatest ? 'bg-brand-600' : 'bg-brand-200 hover:bg-brand-500'
                                }`}
                              />
                            </div>
                            <span className="mt-2 h-5 text-center text-xs text-slate-500">{t.month}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Recent readings */}
            <section
              aria-labelledby="recent-heading"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2"
            >
              <div className="flex items-center justify-between">
                <h2 id="recent-heading" className="text-base font-bold text-navy-900">
                  Recent submitted readings
                </h2>
                <Link
                  to={a.readings}
                  className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"
                >
                  View all <ChevronRight className="size-4" />
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="mt-6 grid h-64 place-items-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-6 text-center text-sm text-slate-500">
                  No readings submitted yet. They appear here as field agents capture them.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[26rem] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th scope="col" className="py-2 pr-3 font-semibold">Household</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Reading (m³)</th>
                        <th scope="col" className="py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recent.map((r) => {
                        const badge = STATUS_BADGES[r.status] ?? {
                          label: r.status,
                          className: 'bg-slate-100 text-slate-600',
                        };
                        return (
                          <tr key={r.id} className="hover:bg-brand-50/60">
                            <td className="py-3 pr-3">
                              <Link
                                to={a.readingReview(r.id)}
                                className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                              >
                                {r.household}
                              </Link>
                              <p className="text-xs text-slate-500">{r.officer}</p>
                            </td>
                            <td className="py-3 pr-3 text-right tabular-nums">
                              {Number(r.reading).toFixed(1)}
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
                              >
                                {badge.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}