import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, LogOut, MapPin, Search, X } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import AgentLayout from './Agentlayout';

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

  return (
    <AgentLayout
      active="households"
      mobileHeaderRight={
        <button
          type="button"
          onClick={signOut}
          aria-label="Log out"
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-800 px-3 py-2 text-sm font-medium hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <LogOut className="size-4" />
          Log out
        </button>
      }
      mobileHeaderExtra={
        <>
          <p className="mt-6 text-sm text-brand-200">Welcome back,</p>
          <p className="truncate text-xl font-extrabold tracking-tight">{agentName}</p>
        </>
      }
    >
      {/* Title + search (side by side on desktop) */}
      <div className="lg:flex lg:items-end lg:justify-between lg:gap-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Select a household</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="hidden lg:inline">Welcome back, {agentName}. </span>
            Pick a household to capture its meter reading.
          </p>
        </div>

        <div className="relative mt-5 lg:mt-0 lg:w-96 lg:shrink-0">
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
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:mt-8">
        {households.length} {households.length === 1 ? 'household' : 'households'}
      </p>

      {/* List: 1 column on phones, 2 on tablets, 2 to 3 on desktop */}
      {households.length > 0 ? (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3">
          {households.map((h) => {
            const status = STATUS_STYLES[h.status] ?? STATUS_STYLES.due;
            return (
              <li key={h.id}>
                <Link
                  to={a.capture(h.id)}
                  className="flex h-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-brand-600 hover:shadow-md active:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
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
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:p-12">
          <p className="text-sm font-semibold text-navy-900">No households found</p>
          <p className="mt-1 text-sm text-slate-500">Check the spelling or try a different search.</p>
        </div>
      )}
    </AgentLayout>
  );
}