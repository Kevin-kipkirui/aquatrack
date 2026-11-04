import { supabase } from './supabase';

// Shared by the Capture reading page and the Sync queue page.
// Queue = readings still waiting to reach the server (status 'queued' or 'failed').
// History = readings that have reached the server (kept so the officer can see them).
export const QUEUE_KEY = 'aquatrack.syncQueue';
export const HISTORY_KEY = 'aquatrack.syncHistory';

const MAX_ATTEMPTS = 3; // per reading, per sync run
const BASE_DELAY_MS = 1000; // exponential backoff: 1s, 2s, 4s
const HISTORY_LIMIT = 50;

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked.
  }
}

export const getQueue = () => read(QUEUE_KEY, []);
export const saveQueue = (queue) => write(QUEUE_KEY, queue);
export const getHistory = () => read(HISTORY_KEY, []);

function addToHistory(entry) {
  write(HISTORY_KEY, [entry, ...getHistory()].slice(0, HISTORY_LIMIT));
}

export function discardFromQueue(localId) {
  saveQueue(getQueue().filter((q) => q.localId !== localId));
}

export function isNetworkError(err) {
  const msg = (err?.message || '').toLowerCase();
  return msg.includes('failed to fetch') || msg.includes('network') || err?.status === 0;
}

// Column names follow the meter_readings table in the system documentation.
// Server rule (section 3.3.3): a repeat for the same household and period is still
// stored, but as 'flagged_duplicate' instead of 'pending_review'.
export async function sendReading(reading, userId) {
  const { data: existing, error: lookupError } = await supabase
    .from('meter_readings')
    .select('id')
    .eq('household_id', reading.householdId)
    .eq('billing_period', reading.billingPeriod)
    .limit(1);
  if (lookupError) throw lookupError;

  const flagged = (existing?.length ?? 0) > 0;
  const { data: inserted, error: insertError } = await supabase
    .from('meter_readings')
    .insert({
      household_id: reading.householdId,
      reading_value: reading.readingValue,
      billing_period: reading.billingPeriod,
      status: flagged ? 'flagged_duplicate' : 'pending_review',
      captured_by: userId,
    })
    .select('status')
    .single();
  if (insertError) throw insertError;
  // The database also flags duplicates from other agents, which this agent cannot see.
  return { flagged: flagged || inserted?.status === 'flagged_duplicate' };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let running = false;

// Sends every waiting reading, one at a time. Network errors are retried with
// exponential backoff; any other error marks that reading 'failed' and moves on.
export async function syncQueue(userId) {
  if (running) return;
  running = true;
  try {
    for (const item of getQueue()) {
      let done = false;
      for (let attempt = 0; attempt < MAX_ATTEMPTS && !done; attempt++) {
        try {
          const { flagged } = await sendReading(item, userId);
          discardFromQueue(item.localId);
          addToHistory({
            ...item,
            status: flagged ? 'flagged' : 'synced',
            syncedAt: new Date().toISOString(),
          });
          done = true;
        } catch (err) {
          if (isNetworkError(err)) {
            if (attempt < MAX_ATTEMPTS - 1) {
              await sleep(BASE_DELAY_MS * 2 ** attempt);
              continue;
            }
            return; // Still no connection: leave the rest queued and try again later.
          }
          saveQueue(
            getQueue().map((q) =>
              q.localId === item.localId ? { ...q, status: 'failed', error: err?.message || 'Rejected by the server.' } : q,
            ),
          );
          done = true;
        }
      }
    }
  } finally {
    running = false;
  }
}