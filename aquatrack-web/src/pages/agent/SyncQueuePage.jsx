import { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { CircleCheck, CloudOff, Home, Loader2, RefreshCw, TriangleAlert, User, Wifi } from 'lucide-react';
import { ROUTES } from '../../config/routes';
import { useAuth } from '../../auth/AuthProvider';
import { discardFromQueue, getHistory, getQueue, syncQueue } from '../../lib/syncQueue';

const AUTO_SYNC_MS = 30000; // background check while the page is open and online

const STATUS_STYLES = {
  queued: { label: 'Pending', className: 'bg-warn-50 text-warn-700' },
  failed: { label: 'Failed', className: 'bg-bad-50 text-bad-700' },
  synced: { label: 'Synced', className: 'bg-ok-50 text-ok-600' },
  flagged: { label: 'Flagged', className: 'bg-warn-50 text-warn-700' },
};

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function formatPeriod(period) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  return online;
}

export default function SyncQueuePage() {
  const a = ROUTES.agent;
  const { user } = useAuth();
  const online = useOnlineStatus();

  const [items, setItems] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    const all = [...getQueue(), ...getHistory()];
    all.sort((x, y) => new Date(y.capturedAt) - new Date(x.capturedAt));
    setItems(all);
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await syncQueue(user?.id);
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [user?.id, refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Sync automatically when the connection returns, and check again at regular intervals.
  useEffect(() => {
    if (!online) return undefined;
    if (getQueue().length > 0) runSync();
    const id = setInterval(() => {
      if (getQueue().length > 0) runSync();
    }, AUTO_SYNC_MS);
    return () => clearInterval(id);
  }, [online, runSync]);

  const count = (status) => items.filter((i) => i.status === status).length;
  const waiting = count('queued') + count('failed');

  const stats = [
    { key: 'synced', label: 'Synced', value: count('synced'), className: 'text-ok-600' },
    { key: 'queued', label: 'Pending', value: count('queued'), className: 'text-warn-700' },
    { key: 'flagged', label: 'Flagged', value: count('flagged'), className: 'text-warn-700' },
    { key: 'failed', label: 'Failed', value: count('failed'), className: 'text-bad-700' },
  ];

  const tabs = [
    { label: 'Households', to: a.home, icon: Home, end: true },
    { label: 'Sync queue', to: a.queue, icon: RefreshCw },
    { label: 'Profile', to: a.profile, icon: User },
  ];

  function discard(item) {
    if (window.confirm('Discard this reading? It will not be sent to the association.')) {
      discardFromQueue(item.localId);
      refresh();
    }
  }

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
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                online ? 'bg-ok-50 text-ok-600' : 'bg-warn-50 text-warn-700'
              }`}
            >
              {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </header>

        {/* -------------------------------- Main -------------------------------- */}
        <main className="-mt-8 flex-1 rounded-t-3xl bg-slate-50 px-5 pb-28 pt-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-navy-900">Sync queue</h1>
          <p className="mt-1 text-sm text-slate-500">Track your submitted readings and send any waiting ones.</p>

          {/* Counts */}
          <dl className="mt-5 grid grid-cols-4 gap-2">
            {stats.map(({ key, label, value, className }) => (
              <div key={key} className="rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm">
                <dd className={`text-2xl font-extrabold ${className}`}>{value}</dd>
                <dt className="mt-0.5 text-[11px] font-semibold text-slate-500">{label}</dt>
              </div>
            ))}
          </dl>

          {!online && waiting > 0 && (
            <div
              role="status"
              className="mt-4 flex items-start gap-3 rounded-xl border border-warn-600/25 bg-warn-50 p-4 text-sm text-warn-700"
            >
              <CloudOff className="mt-0.5 size-4 shrink-0" />
              <p>You’re offline. {waiting} reading{waiting === 1 ? '' : 's'} will sync automatically once you’re back online.</p>
            </div>
          )}

          {count('failed') > 0 && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-bad-600/20 bg-bad-50 p-4 text-sm text-bad-700"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <p>Some readings were rejected by the server. Tap Sync now to retry, or discard them.</p>
            </div>
          )}

          <button
            type="button"
            onClick={runSync}
            disabled={!online || syncing || waiting === 0}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-navy-900 active:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
          >
            {syncing ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
            {syncing ? 'Syncing…' : 'Sync now'}
          </button>

          {/* List */}
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent readings</p>
          {items.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {items.map((item) => {
                const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.queued;
                return (
                  <li key={item.localId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-navy-900">Household {item.householdId}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Reading {Number(item.readingValue).toLocaleString()} · {formatPeriod(item.billingPeriod)}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-400">Captured {formatTime(item.capturedAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.className}`}>
                        {status.label}
                      </span>
                    </div>
                    {item.status === 'flagged' && (
                      <p className="mt-2 text-xs text-warn-700">Possible duplicate. An administrator will review it.</p>
                    )}
                    {item.status === 'failed' && (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-bad-700">{item.error}</p>
                        <button
                          type="button"
                          onClick={() => discard(item)}
                          className="shrink-0 text-xs font-semibold text-slate-500 underline hover:text-navy-900"
                        >
                          Discard
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <CircleCheck className="mx-auto size-6 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-navy-900">Nothing here yet</p>
              <p className="mt-1 text-sm text-slate-500">Readings you capture will appear here.</p>
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