/**
 * dateHelper - small utilities for date ranges and granularity handling
 */
import { parseISO, formatISO, startOfDay, endOfDay, addDays } from 'date-fns';

export function toDateRange(from, to) {
  const start = from ? startOfDay(parseISO(from)) : startOfDay(addDays(new Date(), -30));
  const end = to ? endOfDay(parseISO(to)) : endOfDay(new Date());
  return { start, end };
}

export function normalizeGranularity(g) {
  if (!g) return 'daily';
  const map = { d: 'daily', daily: 'daily', w: 'weekly', weekly: 'weekly', m: 'monthly', monthly: 'monthly' };
  return map[g] || 'daily';
}

export default { toDateRange, normalizeGranularity };
