import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ChevronRight,
  Home,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';

// Sample data. Replace with a Supabase fetch when your households table is ready.
// Each item needs: id, name, area, meterNo, status ('due' | 'done').
const SAMPLE_HOUSEHOLDS = [
  { id: '1', name: 'Sample household 1', area: 'Section 58, Nakuru', meterNo: 'M-0001', status: 'due' },
];

const STATUS_STYLES = {
  due: { label: 'Reading due', className: 'bg-warn-50 text-warn-700' },
  done: { label: 'Read', className: 'bg-ok-50 text-ok-600' },
};

export default function AgentHomePage() {
  const a = ROUTES.agent;
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');

  const agentName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field agent';

  const households = SAMPLE_HOUSEHOLDS.filter((h) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [h.name, h.area, h.meterNo].some((field) => field.toLowerCase().includes(q));
  });

  const tabs = [
    { label: 'Households', to: a.home, icon: Home, end: true },
    { label: 'Sync queue', to: a.queue, icon: RefreshCw },
    { label: 'Profile', to: a.profile, icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-slate-50 sm:shadow-xl">
        {/* ------------------------------- Header ------------------------------- */}
        <header className="bg-navy-900 px-5 pb-16 pt-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-mark.png" alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1.5" />
              <div className="leading-tight">
                <p className="text-lg font-extrabold tracking-tight">AquaTrack</p>
                <p className="text-xs text-brand-200">Field agent</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label="Log out"
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-medium hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>

          <p className="mt-6 text-sm text-brand-200">Welcome back,</p>
          <p className="truncate text-xl font-extrabold tracking-tight">{agentName}</p>
        </header>

        {/* -------------------------------- Main -------------------------------- */}
        <main className="-mt-8 flex-1 rounded-t-3xl bg-slate-50 px-5 pb-28 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Select a household</h1>
          <p className="mt-1 text-sm text-slate-500">Pick a household to capture its meter reading.</p>

          {/* Search */}
          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, area or meter no."
              aria-label="Search households"
              className="w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-12 pr-12 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-slate-400 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-brand-600"
              >
                <X className="size-5" />
              </button>
            )}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {households.length} {households.length === 1 ? 'household' : 'households'}
          </p>

          {/* List */}
          {households.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {households.map((h) => {
                const status = STATUS_STYLES[h.status] ?? STATUS_STYLES.due;
                return (
                  <li key={h.id}>
                    <Link
                      to={a.capture(h.id)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-600 active:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                        <Home className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-bold text-navy-900">{h.name}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                          <MapPin className="size-3.5 shrink-0" />
                          {h.area} · {h.meterNo}
                        </p>
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>
                      <ChevronRight className="size-5 shrink-0 text-slate-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-navy-900">No households found</p>
              <p className="mt-1 text-sm text-slate-500">Check the spelling or try a different search.</p>
            </div>
          )}
        </main>

        {/* ---------------------------- Bottom navigation ---------------------------- */}
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
                      isActive ? 'text-brand-600' : 'text-slate-500 hover:text-navy-900'
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