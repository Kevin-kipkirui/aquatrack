import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Clock,
  Download,
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
  Wallet,
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
  revenueCollected: 486200,
  billsGenerated: 412,
  outstandingCount: 34,
  outstandingAmount: 61800,
  bills: [
    { id: '1', household: 'NRA-0231', owner: 'James Mwangi', consumption: 7.4, amountDue: 740, paymentStatus: 'paid' },
    { id: '2', household: 'NRA-0117', owner: 'Grace Wanjiku', consumption: 12.1, amountDue: 1210, paymentStatus: 'unpaid' },
    { id: '3', household: 'NRA-0084', owner: 'Peter Kamau', consumption: 5.8, amountDue: 580, paymentStatus: 'paid' },
    { id: '4', household: 'NRA-0198', owner: 'Mercy Achieng', consumption: 14.2, amountDue: 1420, paymentStatus: 'paid' },
    { id: '5', household: 'NRA-0056', owner: 'Samuel Kiprop', consumption: 17.6, amountDue: 1760, paymentStatus: 'unpaid' },
  ],
  revenueTrend: [
    { month: 'Jun', total: 402000 },
    { month: 'Jul', total: 431500 },
    { month: 'Aug', total: 486200 },
    { month: 'Sep', total: 455800 },
    { month: 'Oct', total: 471300 },
    { month: 'Nov', total: 486200 },
  ],
};

const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const count = new Intl.NumberFormat('en-KE');
const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

function formatPeriod(value) {
  if (!value) return '—';
  const date = new Date(`${value}-01`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

const STATUS_BADGES = {
  paid: { label: 'Paid', className: 'bg-ok-50 text-ok-700' },
  unpaid: { label: 'Unpaid', className: 'bg-warn-50 text-warn-700' },
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'paid', label: 'Paid' },
];

const PAGE_SIZE = 25;

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function BillingPage() {
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
    const { data: result, error: rpcError } = await supabase.rpc('billing_overview', {
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

  const bills = useMemo(() => overview?.bills ?? [], [overview]);
  const trend = overview?.revenueTrend ?? [];
  const maxTrend = Math.max(...trend.map((t) => Number(t.total)), 1);
  const paidCount = bills.filter((b) => b.paymentStatus === 'paid').length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bills.filter((b) => {
      if (filter !== 'all' && b.paymentStatus !== filter) return false;
      if (!q) return true;
      return `${b.household} ${b.owner ?? ''}`.toLowerCase().includes(q);
    });
  }, [bills, filter, query]);

  const filterCounts = {
    all: bills.length,
    unpaid: bills.filter((b) => b.paymentStatus !== 'paid').length,
    paid: paidCount,
  };

  function exportCsv() {
    const header = ['Household', 'Owner', 'Consumption (m3)', 'Amount due (KES)', 'Status', 'Billing period'];
    const rows = filtered.map((b) => [
      b.household,
      b.owner ?? '',
      b.consumption,
      b.amountDue,
      b.paymentStatus,
      overview?.period ?? '',
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aquatrack-bills-${overview?.period ?? 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const stats = [
    {
      label: 'Revenue collected',
      value: overview ? kes.format(Number(overview.revenueCollected)) : '—',
      hint: 'From paid bills',
      icon: Wallet,
      valueClass: 'text-ok-600',
      chipClass: 'bg-ok-600 text-white',
    },
    {
      label: 'Bills generated',
      value: overview ? count.format(overview.billsGenerated) : '—',
      hint: overview ? `${count.format(paidCount)} paid` : '',
      icon: Receipt,
      valueClass: 'text-brand-600',
      chipClass: 'bg-brand-600 text-white',
    },
    {
      label: 'Outstanding bills',
      value: overview ? count.format(overview.outstandingCount) : '—',
      hint: overview ? `${kes.format(Number(overview.outstandingAmount))} still to collect` : '',
      icon: Clock,
      valueClass: 'text-warn-600',
      chipClass: 'bg-warn-600 text-white',
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
                Billing &amp; payments
                {overview?.period && (
                  <span className="font-semibold text-slate-400"> · {formatPeriod(overview.period)}</span>
                )}
              </h1>
              <p className="mt-1 text-sm text-slate-500">Bills are created automatically when a reading is approved.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
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
                aria-label="Refresh"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm hover:bg-brand-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={!filtered.length}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Download className="size-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Status messages */}
          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load billing figures</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only)
            </p>
          )}

          {/* Stat cards */}
          <section aria-label="Billing summary" className="mt-6 grid gap-4 sm:grid-cols-3">
            {stats.map(({ label, value, hint, icon: Icon, valueClass, chipClass }) => (
              <div key={label} className="rounded-2xl border border-brand-100 bg-brand-50 p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-slate-600">{label}</p>
                  <span className={`grid size-9 place-items-center rounded-xl ${chipClass}`}>
                    <Icon className="size-[18px]" />
                  </span>
                </div>
                {loading ? (
                  <div className="mt-4 h-9 w-32 animate-pulse rounded-lg bg-brand-100" />
                ) : (
                  <p className={`mt-3 text-3xl font-extrabold tracking-tight ${valueClass}`}>{value}</p>
                )}
                <p className="mt-2 min-h-4 text-xs text-slate-500">{loading ? '' : hint}</p>
              </div>
            ))}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-5">
            {/* ------------------------- Household billing summary ------------------------- */}
            <section
              aria-labelledby="summary-heading"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3"
            >
              <h2 id="summary-heading" className="text-base font-bold text-navy-900">
                Household billing summary
              </h2>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div role="tablist" aria-label="Filter by payment status" className="inline-flex rounded-xl bg-slate-100 p-1">
                  {FILTERS.map(({ key, label }) => (
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
                      {label} <span className="text-xs font-medium text-slate-400">{filterCounts[key]}</span>
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-60">
                  <label htmlFor="search" className="sr-only">Search households</label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search household or owner"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                  />
                </div>
              </div>

              {loading ? (
                <div className="mt-5 space-y-3" aria-busy="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-brand-50" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mt-5 grid h-56 place-items-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-6 text-center">
                  <div>
                    <FileSearch className="mx-auto size-8 text-brand-200" />
                    <p className="mt-2 text-sm text-slate-500">
                      {bills.length === 0
                        ? 'No bills for this period yet. They appear here once readings are approved.'
                        : 'No bills match this filter.'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[34rem] text-left text-sm">
                      <caption className="sr-only">Household bills for the selected billing period</caption>
                      <thead>
                        <tr className="border-b border-slate-200 text-xs text-slate-500">
                          <th scope="col" className="py-2 pr-3 font-semibold">Household</th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">Consumption</th>
                          <th scope="col" className="py-2 pr-3 text-right font-semibold">Amount due</th>
                          <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                          <th scope="col" className="py-2"><span className="sr-only">Open bill</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered.slice(0, visible).map((b) => {
                          const badge = STATUS_BADGES[b.paymentStatus] ?? {
                            label: b.paymentStatus,
                            className: 'bg-slate-100 text-slate-600',
                          };
                          return (
                            <tr key={b.id} className="hover:bg-brand-50/60">
                              <td className="py-3 pr-3">
                                <Link
                                  to={a.billDetail(b.id)}
                                  className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                                >
                                  {b.household}
                                </Link>
                                {b.owner && <p className="text-xs text-slate-500">{b.owner}</p>}
                              </td>
                              <td className="py-3 pr-3 text-right tabular-nums">{units.format(b.consumption)} m³</td>
                              <td className="py-3 pr-3 text-right font-semibold tabular-nums text-navy-900">
                                {kes.format(Number(b.amountDue))}
                              </td>
                              <td className="py-3 pr-3">
                                <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <Link
                                  to={a.billDetail(b.id)}
                                  aria-label={`Open bill for ${b.household}`}
                                  className="inline-grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-600"
                                >
                                  <ChevronRight className="size-4" />
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

            {/* ------------------------------ Revenue trend ------------------------------ */}
            <section
              aria-labelledby="trend-heading"
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2"
            >
              <h2 id="trend-heading" className="text-base font-bold text-navy-900">
                Monthly revenue trend <span className="font-medium text-slate-400">(KES ’000)</span>
              </h2>

              {trend.length === 0 ? (
                <div className="mt-6 grid h-64 place-items-center rounded-xl border border-dashed border-brand-200 bg-brand-50/50 px-6 text-center text-sm text-slate-500">
                  No payments recorded yet. Revenue appears here once bills are marked as paid.
                </div>
              ) : (
                <div className="mt-6 flex h-64 items-end gap-2 sm:gap-3">
                  {trend.map((t, i) => {
                    const isLatest = i === trend.length - 1;
                    const pct = Math.max((Number(t.total) / maxTrend) * 100, 2);
                    return (
                      <div key={`${t.month}-${i}`} className="flex h-full flex-1 flex-col justify-end">
                        <span className="mb-1 text-center text-xs font-semibold text-navy-900">
                          {count.format(Math.round(Number(t.total) / 1000))}
                        </span>
                        <div
                          title={`${t.month}: ${kes.format(Number(t.total))}`}
                          style={{ height: `${pct * 0.78}%` }}
                          className={`w-full rounded-t-lg transition-colors ${
                            isLatest ? 'bg-ok-600' : 'bg-ok-600/30 hover:bg-ok-600/60'
                          }`}
                        />
                        <span className="mt-2 h-5 text-center text-xs text-slate-500">{t.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}