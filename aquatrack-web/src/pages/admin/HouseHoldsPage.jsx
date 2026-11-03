import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BarChart3,
  FileSearch,
  Gauge,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
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
// In development, show sample rows when the database call fails so the layout
// can be judged. Never shown in production builds.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const SAMPLE = [
  { id: '1', code: 'NRA-0056', owner: 'Samuel Kiprop', phone: '0722 118 204', meterNumber: 'MTR-118824', section: 'Riverside Block C', rateCategory: 'Standard Residential', previousReading: 158.8 },
  { id: '2', code: 'NRA-0084', owner: 'Peter Kamau', phone: '0733 902 117', meterNumber: 'MTR-118931', section: 'Riverside Block A', rateCategory: 'Standard Residential', previousReading: 104.1 },
  { id: '3', code: 'NRA-0117', owner: 'Grace Wanjiku', phone: '0711 450 886', meterNumber: 'MTR-119042', section: 'Hilltop Block B', rateCategory: 'Standard Residential', previousReading: 193.2 },
  { id: '4', code: 'NRA-0198', owner: 'Mercy Achieng', phone: '0745 331 920', meterNumber: 'MTR-119377', section: 'Hilltop Block B', rateCategory: 'Standard Residential', previousReading: 127.8 },
  { id: '5', code: 'NRA-0231', owner: 'James Mwangi', phone: '0722 445 981', meterNumber: 'MTR-118824', section: 'Riverside Block C', rateCategory: 'Standard Residential', previousReading: 184.2 },
  { id: '6', code: 'NRA-0302', owner: 'Esther Njeri', phone: '0790 214 665', meterNumber: 'MTR-120115', section: 'Parkview Block D', rateCategory: 'Commercial', previousReading: 131.0 },
];

const units = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });
const countFormat = new Intl.NumberFormat('en-KE');

const PAGE_SIZE = 25;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function HouseholdsPage() {
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [households, setHouseholds] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [section, setSection] = useState('all');
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
    const { data, error: rpcError } = await supabase.rpc('households_list');
    if (rpcError) {
      setHouseholds(null);
      setError(rpcError.message);
    } else {
      setHouseholds(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [query, section]);

  const usingSample = !households && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const rows = useMemo(() => households ?? (usingSample ? SAMPLE : []), [households, usingSample]);

  const sections = useMemo(
    () => [...new Set(rows.map((h) => h.section).filter(Boolean))].sort((x, y) => x.localeCompare(y)),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, '');
    return rows.filter((h) => {
      if (section !== 'all' && h.section !== section) return false;
      if (!q) return true;
      const haystack = `${h.code} ${h.owner ?? ''} ${h.meterNumber ?? ''} ${h.phone ?? ''}`
        .toLowerCase()
        .replace(/\s+/g, '');
      return haystack.includes(q);
    });
  }, [rows, query, section]);

  const hasData = rows.length > 0;

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
              <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Households</h1>
              <p className="mt-1 text-sm text-slate-500">
                {loading
                  ? 'Loading household records…'
                  : hasData
                    ? `${countFormat.format(rows.length)} registered ${rows.length === 1 ? 'household' : 'households'} across ${countFormat.format(sections.length)} ${sections.length === 1 ? 'section' : 'sections'}.`
                    : 'Register each household once, then field agents can capture its readings.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-navy-900 shadow-sm hover:bg-brand-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                to={a.householdNew}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <Plus className="size-4" />
                Add household
              </Link>
            </div>
          </div>

          {/* Status messages */}
          {error && (
            <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-semibold">Could not load households</p>
                <p>{error}</p>
              </div>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only)
            </p>
          )}

          {/* Table card */}
          <section aria-labelledby="households-heading" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 id="households-heading" className="sr-only">Registered households</h2>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-80">
                <label htmlFor="search" className="sr-only">Search households</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search ID, owner, meter or phone"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                />
              </div>

              <label htmlFor="section" className="sr-only">Filter by section</label>
              <select
                id="section"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                disabled={!sections.length}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-navy-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
              >
                <option value="all">All sections</option>
                {sections.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {!loading && hasData && (
                <p className="text-sm text-slate-500 sm:ml-auto">
                  {filtered.length === rows.length
                    ? `${countFormat.format(rows.length)} households`
                    : `${countFormat.format(filtered.length)} of ${countFormat.format(rows.length)} match`}
                </p>
              )}
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
                  <FileSearch className="mx-auto size-8 text-brand-200" />
                  <p className="mt-2 text-sm text-slate-500">
                    {hasData
                      ? 'No households match your search.'
                      : 'No households registered yet. Add the first one to get started.'}
                  </p>
                  {!hasData && (
                    <Link
                      to={a.householdNew}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-navy-900"
                    >
                      <Plus className="size-4" />
                      Add household
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <caption className="sr-only">Registered households</caption>
                    <thead>
                      <tr className="border-b border-slate-200 text-xs text-slate-500">
                        <th scope="col" className="py-2 pr-3 font-semibold">Household</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Meter number</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Section / block</th>
                        <th scope="col" className="py-2 pr-3 font-semibold">Rate category</th>
                        <th scope="col" className="py-2 pr-3 text-right font-semibold">Last reading</th>
                        <th scope="col" className="py-2"><span className="sr-only">Edit</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.slice(0, visible).map((h) => (
                        <tr key={h.id} className="hover:bg-brand-50/60">
                          <td className="py-3 pr-3">
                            <Link
                              to={a.householdEdit(h.id)}
                              className="font-semibold text-navy-900 hover:text-brand-600 hover:underline"
                            >
                              {h.code}
                            </Link>
                            <p className="text-xs text-slate-500">
                              {[h.owner, h.phone].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </td>
                          <td className="py-3 pr-3 font-mono text-xs text-slate-700">{h.meterNumber || '—'}</td>
                          <td className="py-3 pr-3 text-slate-700">{h.section || '—'}</td>
                          <td className="py-3 pr-3">
                            {h.rateCategory ? (
                              <span className="inline-block whitespace-nowrap rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-navy-800">
                                {h.rateCategory}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-right tabular-nums">
                            {h.previousReading == null ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              `${units.format(Number(h.previousReading))} m³`
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Link
                              to={a.householdEdit(h.id)}
                              aria-label={`Edit ${h.code}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-100 px-3 py-1.5 text-xs font-bold text-navy-900 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Link>
                          </td>
                        </tr>
                      ))}
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