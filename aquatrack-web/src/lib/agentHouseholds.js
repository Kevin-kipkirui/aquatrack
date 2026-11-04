import { supabase } from './supabase';

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

export function householdLabel(h) {
  return [h?.houseNumber, h?.area].filter(Boolean).join(', ') || h?.code || '';
}
