import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, CloudOff, Loader2, RefreshCw, TriangleAlert } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { discardFromQueue, getHistory, getQueue, syncQueue } from '../../lib/syncQueue';
import { getCachedHouseholds, householdLabel } from '../../lib/agentHouseholds';
import AgentLayout from './Agentlayout';

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
  const { user } = useAuth();
  const online = useOnlineStatus();

  const [items, setItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [households] = useState(() => new Map(getCachedHouseholds().map((h) => [h.id, h])));

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

  function discard(item) {
    if (window.confirm('Discard this reading? It will not be sent to the association.')) {
      discardFromQueue(item.localId);
      refresh();
    }
  }

  return (
    <AgentLayout active="queue" online={online}>
      <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 lg:text-3xl">Sync queue</h1>
      <p className="mt-1 text-sm text-slate-500">Track your submitted readings and send any waiting ones.</p>

      {/* Counts */}
      <dl className="mt-5 grid grid-cols-4 gap-2 lg:mt-8 lg:gap-4">
        {stats.map(({ key, label, value, className }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white px-2 py-3 text-center shadow-sm lg:py-6"
          >
            <dd className={`text-2xl font-extrabold lg:text-4xl ${className}`}>{value}</dd>
            <dt className="mt-0.5 text-[11px] font-semibold text-slate-500 lg:mt-1 lg:text-sm">{label}</dt>
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

      {/* Phones: button first, then the list label. Desktop: label on the left, button on the right. */}
      <div className="mt-4 flex flex-col gap-6 lg:mt-8 lg:flex-row-reverse lg:items-center lg:justify-between lg:gap-4">
        <button
          type="button"
          onClick={runSync}
          disabled={!online || syncing || waiting === 0}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-4 text-base font-bold text-white shadow-sm transition-colors hover:bg-navy-900 active:bg-navy-900 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 lg:w-auto lg:px-8 lg:py-3"
        >
          {syncing ? <Loader2 className="size-5 animate-spin" /> : <RefreshCw className="size-5" />}
          {syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent readings</p>
      </div>

      {/* List: 1 column on phones, 2 on desktop */}
      {items.length > 0 ? (
        <ul className="mt-3 grid gap-3 lg:grid-cols-2 lg:gap-4">
          {items.map((item) => {
            const status = STATUS_STYLES[item.status] ?? STATUS_STYLES.queued;
            return (
              <li key={item.localId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold text-navy-900">
                      {households.has(item.householdId)
                        ? householdLabel(households.get(item.householdId))
                        : `Household ${item.householdId}`}
                    </p>
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
        <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center lg:p-12">
          <CircleCheck className="mx-auto size-6 text-slate-400" />
          <p className="mt-2 text-sm font-semibold text-navy-900">Nothing here yet</p>
          <p className="mt-1 text-sm text-slate-500">Readings you capture will appear here.</p>
        </div>
      )}
    </AgentLayout>
  );
}