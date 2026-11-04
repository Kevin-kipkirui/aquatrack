import { supabase } from './supabase';

// Shared by the agent pages. The list is cached on the phone so the
// Constituency > Area > search narrowing still works with no signal.
const CACHE_KEY = 'aquatrack.households';

export function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getCachedHouseholds() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Fetches the list, refreshes the cache, and returns it. Throws on failure.
export async function fetchAgentHouseholds() {
  const { data, error } = await supabase.rpc('agent_households', { p_period: currentPeriod() });
  if (error) throw error;
  const list = Array.isArray(data) ? data : [];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked: the list still works for this visit.
  }
  return list;
}

// Label used wherever a household is shown to an agent.
export function householdLabel(h) {
  return [h.houseNumber, h.area].filter(Boolean).join(', ') || h.code || '';
}