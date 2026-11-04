import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, CloudOff, Home, Loader2, LogOut, MapPin, Search, TriangleAlert, X } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { fetchAgentHouseholds, getCachedHouseholds } from '../../lib/agentHouseholds';
import AgentLayout from './Agentlayout';

const STATUS_STYLES = {
  due: { label: 'Reading due', className: 'bg-warn-50 text-warn-700' },
  done: { label: 'Read', className: 'bg-ok-50 text-ok-600' },
};

const SELECT_CLASS =
  'w-full rounded-xl border border-slate-300 bg-white py-3.5 pl-4 pr-10 text-base text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const norm = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, '');
const byName = (x, y) => x.localeCompare(y);

export default function AgentHomePage() {
  const a = ROUTES.agent;
  const { user, signOut } = useAuth();

  const [all, setAll] = useState(() => getCachedHouseholds()); // cached copy works offline
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [constituency, setConstituency] = useState('');
  const [area, setArea] = useState('');
  const [query, setQuery] = useState('');

  const agentName =
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field agent';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAll(await fetchAgentHouseholds());
    } catch (err) {
      setError(err?.message || 'Could not load households.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Each dropdown only offers places that actually have households.
  const constituencies = useMemo(
    () => [...new Set(all.map((h) => h.constituency).filter(Boolean))].sort(byName),
    [all]
  );
  const areas = useMemo(
    () =>
      [
        ...new Set(
          all
            .filter((h) => !constituency || h.constituency === constituency)
            .map((h) => h.area)
            .filter(Boolean)
        ),
      ].sort(byName),
    [all, constituency]
  );

  function pickConstituency(value) {
    setConstituency(value);
    setArea(''); // the old area may not exist in the new constituency
  }

  const households = useMemo(() => {
    const q = norm(query);
    return all.filter((h) => {
      // A meter number is unique, so typing one finds the household wherever it is.
      if (q.length >= 3 && norm(h.meterNo).includes(q)) return true;
      if (constituency && h.constituency !== constituency) return false;
      if (area && h.area !== area) return false;
      if (!q) return true;
      return [h.houseNumber, h.owner, h.meterNo, h.code, h.area].some((f) => norm(f).includes(q));
    });
  }, [all, constituency, area, query]);

  const narrowed = Boolean(constituency || area || query);
  function clearAll() {
    setConstituency('');
    setArea('');
    setQuery('');
  }

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
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Select a household</h1>
      <p className="mt-1 text-sm text-slate-500">
        <span className="hidden lg:inline">Welcome back, {agentName}. </span>
        Choose the constituency and village, then search by house number or meter number.
      </p>

      {/* Narrowing: constituency > village/estate > search */}
      <div className="mt-5 grid gap-3 lg:mt-8 lg:grid-cols-3 lg:gap-4">
        <div>
          <label htmlFor="constituency" className="mb-1 block text-xs font-semibold text-slate-500">
            Constituency
          </label>
          <select
            id="constituency"
            value={constituency}
            onChange={(e) => pickConstituency(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">All constituencies</option>
            {constituencies.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="area" className="mb-1 block text-xs font-semibold text-slate-500">
            Village / estate
          </label>
          <select
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            disabled={areas.length === 0}
            className={SELECT_CLASS}
          >
            <option value="">{constituency ? `All of ${constituency}` : 'All villages and estates'}</option>
            {areas.map((x) => (
              <option key={x} value={x}>{x}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="search" className="mb-1 block text-xs font-semibold text-slate-500">
            House no., name or meter no.
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
            <input
              id="search"
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. House 14 or MTR-118824"
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
      </div>

      {error && (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="flex-1">
            <p>
              {all.length > 0
                ? 'Could not refresh the list. Showing the copy saved on this phone.'
                : error}
            </p>
            <button type="button" onClick={load} className="mt-1 font-semibold underline">Try again</button>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 lg:mt-8">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {loading && all.length === 0 ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> Loading households
            </>
          ) : (
            <>
              {households.length} {households.length === 1 ? 'household' : 'households'}
              {narrowed && all.length > 0 && <span className="font-normal normal-case">of {all.length}</span>}
              {loading && <Loader2 className="size-3.5 animate-spin" />}
            </>
          )}
        </p>
        {narrowed && (
          <button type="button" onClick={clearAll} className="text-xs font-semibold text-brand-600 underline hover:text-navy-900">
            Clear filters
          </button>
        )}
      </div>

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
                    <p className="truncate text-base font-bold text-navy-900">
                      {h.houseNumber || h.owner}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {h.houseNumber ? `${h.owner} · ` : ''}
                      <span className="font-mono">{h.meterNo}</span>
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                      <MapPin className="size-3.5 shrink-0" />
                      {[h.area, h.constituency].filter(Boolean).join(' · ')}
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
        !loading && (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:p-12">
            {all.length === 0 ? (
              <>
                <CloudOff className="mx-auto size-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-navy-900">No households yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Ask an administrator to register households. Connect to the internet once to download the list.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-navy-900">No households found</p>
                <p className="mt-1 text-sm text-slate-500">Check the spelling, or widen the village or constituency.</p>
              </>
            )}
          </div>
        )
      )}
    </AgentLayout>
  );
}