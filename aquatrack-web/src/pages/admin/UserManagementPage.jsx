import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  BarChart3,
  CircleCheck,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
  UserPlus,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { supabase } from '../../lib/supabase';

// ---------------------------------------------------------------------------
// Config and helpers
// ---------------------------------------------------------------------------
// Development only: show sample users if the database call fails so the layout
// can be judged. Never shown in production builds, and actions are disabled.
const SHOW_SAMPLE_WHEN_UNAVAILABLE = import.meta.env.DEV;

const SAMPLE = {
  rows: [
    { id: 's1', name: 'Grace Wambui', email: 'grace@example.com', phone: null, role: 'admin', active: true, lastSignIn: new Date().toISOString(), isSelf: true },
    { id: 's2', name: 'Peter Kiprop', email: null, phone: '0712 345 678', role: 'field_officer', active: true, lastSignIn: new Date(Date.now() - 3600e3 * 5).toISOString(), isSelf: false },
    { id: 's3', name: 'Mercy Achieng', email: null, phone: '0723 456 789', role: 'field_officer', active: true, lastSignIn: new Date(Date.now() - 86400e3 * 3).toISOString(), isSelf: false },
    { id: 's4', name: 'John Maina', email: null, phone: '0734 567 890', role: 'field_officer', active: false, lastSignIn: null, isSelf: false },
  ],
};

const ROLE_LABEL = { admin: 'Administrator', field_officer: 'Field agent' };
const count = new Intl.NumberFormat('en-KE');

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || '?'
  );
}

function lastSeen(iso) {
  if (!iso) return 'Never signed in';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return 'Just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ icon: Icon, label, value, tone }) {
  const tones = {
    brand: 'bg-brand-600 text-white',
    navy: 'bg-navy-900 text-white',
    ok: 'bg-ok-50 text-ok-700',
    warn: 'bg-warn-50 text-warn-700',
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function UserManagementPage() {
  const a = ROUTES.admin;
  const { user, signOut } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [confirm, setConfirm] = useState(null); // { user, activate }
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

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const { data: result, error } = await supabase.rpc('users_list');
    if (error) {
      setData(null);
      setLoadError(error.message);
    } else {
      setData(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usingSample = !data && !loading && SHOW_SAMPLE_WHEN_UNAVAILABLE;
  const rows = (data ?? (usingSample ? SAMPLE : null))?.rows ?? null;

  // Close the confirmation dialog with Escape
  useEffect(() => {
    if (!confirm) return undefined;
    const onKey = (e) => e.key === 'Escape' && !acting && setConfirm(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirm, acting]);

  const stats = useMemo(() => {
    const list = rows ?? [];
    return {
      total: list.length,
      admins: list.filter((r) => r.role === 'admin').length,
      agents: list.filter((r) => r.role === 'field_officer').length,
      inactive: list.filter((r) => !r.active).length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (roleFilter === 'all' || r.role === roleFilter) &&
        (statusFilter === 'all' || (statusFilter === 'active') === r.active) &&
        (!q ||
          r.name.toLowerCase().includes(q) ||
          (r.email ?? '').toLowerCase().includes(q) ||
          (r.phone ?? '').replace(/\s/g, '').includes(q.replace(/\s/g, ''))),
    );
  }, [rows, query, roleFilter, statusFilter]);

  function openConfirm(target, activate) {
    setActionError('');
    setFlash('');
    setConfirm({ user: target, activate });
  }

  async function applyChange() {
    setActing(true);
    setActionError('');
    const { error } = await supabase.rpc('users_set_active', {
      p_user_id: confirm.user.id,
      p_active: confirm.activate,
    });
    setActing(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setData((d) => ({
      ...d,
      rows: d.rows.map((r) => (r.id === confirm.user.id ? { ...r, active: confirm.activate } : r)),
    }));
    setFlash(
      confirm.activate
        ? `${confirm.user.name} can sign in again.`
        : `${confirm.user.name} has been deactivated and signed out.`,
    );
    setConfirm(null);
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
              <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">User Management</h1>
              <p className="mt-1 text-sm text-slate-500">Administrators and field agents who can sign in to AquaTrack.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={load}
                disabled={loading}
                aria-label="Refresh users"
                className="rounded-xl border border-slate-300 bg-white p-2.5 text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to={a.recruitAgent}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <UserPlus className="size-4" />
                Recruit field agent
              </Link>
            </div>
          </div>

          {loadError && (
            <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Could not load users</p>
                <p>{loadError}</p>
              </div>
              <button type="button" onClick={load} className="font-semibold underline">Try again</button>
            </div>
          )}
          {usingSample && (
            <p className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-navy-800">
              Showing sample data while the database is unavailable (development only). Actions are disabled.
            </p>
          )}
          {flash && (
            <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-ok-600/20 bg-ok-50 p-4 text-sm text-ok-700">
              <CircleCheck className="mt-0.5 size-4 shrink-0" />
              <p className="font-semibold">{flash}</p>
            </div>
          )}

          {loading && !rows ? (
            <div className="mt-6 space-y-6" aria-busy="true">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-brand-50" />)}
              </div>
              <div className="h-80 animate-pulse rounded-2xl bg-brand-50" />
            </div>
          ) : (
            rows && (
              <div className="mt-6 space-y-6">
                <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <StatCard icon={Users} tone="brand" label="Total users" value={count.format(stats.total)} />
                  <StatCard icon={ShieldCheck} tone="navy" label="Administrators" value={count.format(stats.admins)} />
                  <StatCard icon={UserCheck} tone="ok" label="Field agents" value={count.format(stats.agents)} />
                  <StatCard icon={UserX} tone="warn" label="Deactivated" value={count.format(stats.inactive)} />
                </section>

                <section aria-labelledby="users-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 id="users-heading" className="text-lg font-bold text-navy-900">All users</h2>
                      <p className="text-sm text-slate-500">
                        {count.format(filtered.length)} of {count.format(rows.length)} shown
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <label htmlFor="user-search" className="sr-only">Search by name, email or phone</label>
                        <input
                          id="user-search"
                          type="search"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search name, email, phone"
                          className="w-64 rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
                        />
                      </div>
                      <label htmlFor="role-filter" className="sr-only">Role</label>
                      <select id="role-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={selectClass}>
                        <option value="all">All roles</option>
                        <option value="admin">Administrators</option>
                        <option value="field_officer">Field agents</option>
                      </select>
                      <label htmlFor="status-filter" className="sr-only">Status</label>
                      <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectClass}>
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Deactivated</option>
                      </select>
                    </div>
                  </div>

                  {filtered.length === 0 ? (
                    <p className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                      {rows.length === 0 ? 'No users yet.' : 'No users match these filters.'}
                    </p>
                  ) : (
                    <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <tr>
                            <th scope="col" className="px-4 py-3">User</th>
                            <th scope="col" className="px-4 py-3">Contact</th>
                            <th scope="col" className="px-4 py-3">Role</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3">Last sign-in</th>
                            <th scope="col" className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filtered.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span
                                    aria-hidden="true"
                                    className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-bold ${
                                      r.role === 'admin' ? 'bg-navy-900 text-white' : 'bg-brand-100 text-navy-800'
                                    }`}
                                  >
                                    {initials(r.name)}
                                  </span>
                                  <span className="font-semibold text-navy-900">
                                    {r.name}
                                    {r.isSelf && (
                                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">You</span>
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{r.email || r.phone || '—'}</td>
                              <td className="px-4 py-3 text-slate-600">{ROLE_LABEL[r.role] ?? r.role}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    r.active ? 'bg-ok-50 text-ok-700' : 'bg-bad-50 text-bad-700'
                                  }`}
                                >
                                  {r.active ? 'Active' : 'Deactivated'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{lastSeen(r.lastSignIn)}</td>
                              <td className="px-4 py-3 text-right">
                                {r.isSelf ? (
                                  <span className="text-xs text-slate-400">—</span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={usingSample}
                                    onClick={() => openConfirm(r, !r.active)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
                                      r.active
                                        ? 'border-bad-600/30 text-bad-700 hover:bg-bad-50'
                                        : 'border-brand-600/30 text-brand-600 hover:bg-brand-50'
                                    }`}
                                  >
                                    {r.active ? 'Deactivate' : 'Reactivate'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="mt-4 text-xs text-slate-500">
                    Deactivated users are signed out and cannot log in until reactivated. Their readings and records are kept.
                    New field agents are added from <Link to={a.recruitAgent} className="font-semibold text-brand-600 hover:underline">Recruit Field Agent</Link>.
                  </p>
                </section>
              </div>
            )
          )}
        </div>
      </main>

      {/* ------------------------------ Confirm dialog ------------------------------ */}
      {confirm && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-navy-950/60 p-4"
          onClick={() => !acting && setConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <h2 id="confirm-title" className="text-lg font-bold text-navy-900">
              {confirm.activate ? 'Reactivate' : 'Deactivate'} {confirm.user.name}?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {confirm.activate
                ? 'They will be able to sign in again with their existing details.'
                : 'They will be signed out immediately and will not be able to log in until you reactivate them. Their past readings and records stay as they are.'}
            </p>
            {actionError && (
              <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-3 text-sm text-bad-700">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                <p>{actionError}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={acting}
                onClick={() => setConfirm(null)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={applyChange}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  confirm.activate ? 'bg-brand-600 hover:bg-navy-900 focus-visible:outline-brand-600' : 'bg-bad-600 hover:bg-bad-700 focus-visible:outline-bad-600'
                }`}
              >
                {acting && <Loader2 className="size-4 animate-spin" />}
                {acting ? 'Working…' : confirm.activate ? 'Reactivate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}