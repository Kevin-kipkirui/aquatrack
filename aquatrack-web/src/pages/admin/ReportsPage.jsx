import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Banknote,
  BarChart3,
  FileText,
  Download,
  Droplets,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  TrendingUp,
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
// Development only: show sample figures if the database call fails so the
// layout can be judged. Never shown in production builds.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const PERIOD_OPTIONS = [
  { value: 3, label: 'Last 3 months' },
  { value: 6, label: 'Last 6 months' },
  { value: 12, label: 'Last 12 months' },
];
const PAGE_SIZE = 25;

const kes = new Intl.NumberFormat('en-KE', {
  style: 'currency',
  currency: 'KES',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const num = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 1 });
const count = new Intl.NumberFormat('en-KE');

function monthShort(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'short' });
}
function monthLong(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });
}

// Spreadsheet programs run text starting with = + - @ as a formula, so defuse it.
function csvCell(value) {
  let s = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function buildSample(months) {
  const periods = Array.from({ length: months }, (_, i) => {
    const d = new Date(new Date().getFullYear(), new Date().getMonth() - (months - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const trend = periods.map((period, i) => {
    const billed = 180000 + i * 9000 + (i % 2) * 6000;
    return { period, billed, collected: Math.round(billed * (0.78 + (i % 3) * 0.05)), bills: 120 + i * 3, consumption: Math.round(billed / 60) };
  });
  const sections = [
    { section: 'Block A', consumption: 1480, bills: 98, billed: 88800 },
    { section: 'Block B', consumption: 1190, bills: 84, billed: 71400 },
    { section: 'Block C', consumption: 860, bills: 61, billed: 51600 },
    { section: 'Unassigned', consumption: 120, bills: 9, billed: 7200 },
  ];
  const rows = Array.from({ length: 40 }, (_, i) => ({
    id: `s${i}`,
    owner: ['Wanjiku Kamau', 'Otieno Odhiambo', 'Chebet Rotich', 'Mwangi Njoroge'][i % 4],
    meter: `MTR-${1000 + i}`,
    section: sections[i % 3].section,
    period: periods[periods.length - 1],
    consumption: 8 + (i % 11),
    amount: (8 + (i % 11)) * 60,
    status: i % 3 === 0 ? 'unpaid' : 'paid',
  }));
  const sum = (k) => trend.reduce((t, x) => t + x[k], 0);
  return {
    months,
    currentPeriod: periods[periods.length - 1],
    summary: {
      revenueCollected: sum('collected'),
      billsGenerated: sum('bills'),
      outstandingBills: 214,
      outstandingAmount: sum('billed') - sum('collected'),
      consumption: sum('consumption'),
    },
    trend,
    sections,
    rows,
  };
}

// ---------------------------------------------------------------------------
// Small presentational pieces
// ---------------------------------------------------------------------------
function StatCard({ icon: Icon, label, value, hint, tone = 'brand' }) {
  const tones = {
    brand: 'bg-brand-600 text-white',
    navy: 'bg-navy-900 text-white',
    warn: 'bg-warn-50 text-warn-700',
    ok: 'bg-ok-50 text-ok-700',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon className="size-5" />
        </span>
        <p className="text-sm font-semibold text-slate-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight text-navy-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const paid = status === 'paid';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        paid ? 'bg-ok-50 text-ok-700' : 'bg-warn-50 text-warn-700'
      }`}
    >
      {paid ? 'Paid' : 'Unpaid'}
    </span>
  );
}

function TrendChart({ trend }) {
  const max = Math.max(1, ...trend.map((t) => Math.max(Number(t.billed), Number(t.collected))));
  const pct = (v) => `${Math.max((Number(v) / max) * 100, Number(v) > 0 ? 2 : 0)}%`;
  return (
    <div>
      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-brand-100 ring-1 ring-brand-600/30" /> Billed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-brand-600" /> Collected
        </span>
      </div>

      <div className="mt-4 flex h-56 items-end gap-2 border-b border-slate-200 sm:gap-4" aria-hidden="true">
        {trend.map((t) => (
          <div key={t.period} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
            <div
              title={`${monthLong(t.period)} billed: ${kes.format(t.billed)}`}
              className="w-1/2 max-w-7 rounded-t bg-brand-100 ring-1 ring-inset ring-brand-600/20"
              style={{ height: pct(t.billed) }}
            />
            <div
              title={`${monthLong(t.period)} collected: ${kes.format(t.collected)}`}
              className="w-1/2 max-w-7 rounded-t bg-brand-600"
              style={{ height: pct(t.collected) }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-4" aria-hidden="true">
        {trend.map((t) => (
          <p key={t.period} className="min-w-0 flex-1 truncate text-center text-xs font-medium text-slate-500">
            {monthShort(t.period)}
          </p>
        ))}
      </div>

      {/* Same data for screen readers */}
      <table className="sr-only">
        <caption>Monthly revenue: billed and collected</caption>
        <thead>
          <tr><th>Month</th><th>Billed</th><th>Collected</th></tr>
        </thead>
        <tbody>
          {trend.map((t) => (
            <tr key={t.period}>
              <td>{monthLong(t.period)}</td>
              <td>{kes.format(t.billed)}</td>
              <td>{kes.format(t.collected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionBars({ sections }) {
  const max = Math.max(1, ...sections.map((s) => Number(s.consumption)));
  return (
    <ul className="space-y-4">
      {sections.map((s) => (
        <li key={s.section}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-navy-900">{s.section}</span>
            <span className="tabular-nums text-slate-600">
              {num.format(s.consumption)} units · {kes.format(s.billed)}
            </span>
          </div>
          <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${(Number(s.consumption) / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ReportsPage() {
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [months, setMonths] = useState(6);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

  const requestId = useRef(0);

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
    const id = ++requestId.current;
    setLoading(true);
    setLoadError('');
    const { data: result, error } = await supabase.rpc('reports_get', { p_months: months });
    if (id !== requestId.current) return; // a newer request replaced this one
    if (error) {
      setData(null);
      setLoadError(error.message);
    } else {
      setData(result);
    }
    setLoading(false);
  }, [months]);

  useEffect(() => {
    load();
  }, [load]);

  const usingSample = !data && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const report = data ?? (usingSample ? buildSample(months) : null);

  const filteredRows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    return report.rows.filter(
      (r) =>
        (statusFilter === 'all' || r.status === statusFilter) &&
        (!q ||
          (r.owner ?? '').toLowerCase().includes(q) ||
          (r.meter ?? '').toLowerCase().includes(q) ||
          (r.section ?? '').toLowerCase().includes(q)),
    );
  }, [report, statusFilter, query]);

  useEffect(() => setVisible(PAGE_SIZE), [statusFilter, query, months]);

  const hasBills = (report?.summary.billsGenerated ?? 0) > 0;

  function exportCsv() {
    const header = ['Household', 'Meter number', 'Section', 'Billing period', 'Units (m3)', 'Amount due (KES)', 'Payment status'];
    const lines = filteredRows.map((r) =>
      [r.owner, r.meter, r.section, r.period, r.consumption, r.amount, r.status].map(csvCell).join(','),
    );
    const csv = '﻿' + [header.map(csvCell).join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `aquatrack-billing-${statusFilter}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const selectClass =
    'rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100';

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
        <div className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
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
                  isActive ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-300 hover:bg-navy-800 hover:text-white'
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
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">
                Reports &amp; Analytics
              </h1>
              <p className="mt-1 text-sm text-slate-500">Revenue, consumption and billing across the association.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="period" className="sr-only">Reporting period</label>
              <select id="period" value={months} onChange={(e) => setMonths(Number(e.target.value))} className={selectClass}>
                {PERIOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={load}
                disabled={loading}
                aria-label="Refresh reports"
                className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {loadError && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load reports</p>
                <p>{loadError}</p>
              </div>
              <button type="button" onClick={load} className="font-semibold underline">Try again</button>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only).
            </p>
          )}

          {loading && !report ? (
            <div className="mt-6 space-y-6" aria-busy="true">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-brand-50" />)}
              </div>
              <div className="h-80 animate-pulse rounded-2xl bg-brand-50" />
            </div>
          ) : (
            report && (
              <div className={`mt-6 space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
                {/* ------------------------------- Summary ------------------------------- */}
                <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard
                    icon={Banknote}
                    label="Revenue collected"
                    value={kes.format(report.summary.revenueCollected)}
                    hint={`Paid bills, last ${report.months} months`}
                  />
                  <StatCard
                    icon={FileText}
                    tone="navy"
                    label="Bills generated"
                    value={count.format(report.summary.billsGenerated)}
                    hint={`Last ${report.months} months`}
                  />
                  <StatCard
                    icon={TriangleAlert}
                    tone="warn"
                    label="Outstanding bills"
                    value={count.format(report.summary.outstandingBills)}
                    hint={`${kes.format(report.summary.outstandingAmount)} still unpaid`}
                  />
                  <StatCard
                    icon={Droplets}
                    tone="ok"
                    label="Water billed"
                    value={`${num.format(report.summary.consumption)} m³`}
                    hint="Total consumption billed"
                  />
                </section>

                {!hasBills ? (
                  <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                    <TrendingUp className="mx-auto size-8 text-brand-600" />
                    <h2 className="mt-3 text-lg font-bold text-navy-900">No bills in this period yet</h2>
                    <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                      Reports fill in once readings are approved and bills are generated.{' '}
                      <Link to={a.readings} className="font-semibold text-brand-600 hover:underline">
                        Review meter readings
                      </Link>
                    </p>
                  </section>
                ) : (
                  <>
                    {/* --------------------------- Charts --------------------------- */}
                    <div className="grid gap-6 lg:grid-cols-5">
                      <section aria-labelledby="trend-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-3">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                            <TrendingUp className="size-5" />
                          </span>
                          <div>
                            <h2 id="trend-heading" className="text-lg font-bold text-navy-900">Monthly revenue trend</h2>
                            <p className="text-sm text-slate-500">Amount billed against amount collected, in KES.</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <TrendChart trend={report.trend} />
                        </div>
                      </section>

                      <section aria-labelledby="section-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 place-items-center rounded-xl bg-navy-900 text-white">
                            <Map className="size-5" />
                          </span>
                          <div>
                            <h2 id="section-heading" className="text-lg font-bold text-navy-900">Consumption by section</h2>
                            <p className="text-sm text-slate-500">Units (m³) billed per block.</p>
                          </div>
                        </div>
                        <div className="mt-6">
                          <SectionBars sections={report.sections} />
                        </div>
                      </section>
                    </div>

                    {/* ------------------------ Billing summary ------------------------ */}
                    <section aria-labelledby="table-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h2 id="table-heading" className="text-lg font-bold text-navy-900">Household billing summary</h2>
                          <p className="text-sm text-slate-500">
                            {count.format(filteredRows.length)} {filteredRows.length === 1 ? 'bill' : 'bills'}
                            {statusFilter !== 'all' && ` · ${statusFilter}`}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                            <label htmlFor="search" className="sr-only">Search household, meter or section</label>
                            <input
                              id="search"
                              type="search"
                              value={query}
                              onChange={(e) => setQuery(e.target.value)}
                              placeholder="Search household, meter, section"
                              className="w-64 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                            />
                          </div>
                          <label htmlFor="status" className="sr-only">Payment status</label>
                          <select id="status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                            <option value="all">All statuses</option>
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                          </select>
                          <button
                            type="button"
                            onClick={exportCsv}
                            disabled={filteredRows.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                          >
                            <Download className="size-4" />
                            Export CSV
                          </button>
                        </div>
                      </div>

                      {filteredRows.length === 0 ? (
                        <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                          No bills match these filters.
                        </p>
                      ) : (
                        <>
                          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full min-w-[720px] text-left text-sm">
                              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                  <th scope="col" className="px-4 py-3">Household</th>
                                  <th scope="col" className="px-4 py-3">Meter</th>
                                  <th scope="col" className="px-4 py-3">Section</th>
                                  <th scope="col" className="px-4 py-3">Period</th>
                                  <th scope="col" className="px-4 py-3 text-right">Units</th>
                                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                                  <th scope="col" className="px-4 py-3">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredRows.slice(0, visible).map((r) => (
                                  <tr key={r.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-semibold text-navy-900">{r.owner}</td>
                                    <td className="px-4 py-3 tabular-nums text-slate-600">{r.meter || '—'}</td>
                                    <td className="px-4 py-3 text-slate-600">{r.section}</td>
                                    <td className="px-4 py-3 text-slate-600">{monthLong(r.period)}</td>
                                    <td className="px-4 py-3 text-right tabular-nums">{num.format(r.consumption)}</td>
                                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{kes.format(r.amount)}</td>
                                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {visible < filteredRows.length && (
                            <div className="mt-4 text-center">
                              <button
                                type="button"
                                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-navy-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                              >
                                Show more ({count.format(filteredRows.length - visible)} remaining)
                              </button>
                            </div>
                          )}
                          {report.rows.length >= 1000 && (
                            <p className="mt-3 text-xs text-slate-500">
                              Showing the 1,000 most recent bills. Choose a shorter period to narrow the list.
                            </p>
                          )}
                        </>
                      )}
                    </section>
                  </>
                )}
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}