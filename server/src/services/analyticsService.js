import User from '../models/User.js';
import Service from '../models/Service.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Payment from '../models/Payment.js';
import AggregatedMetrics from '../models/AggregatedMetrics.js';
import { Op, fn, col, literal } from 'sequelize';
import redis from '../config/redis.js';
import { toDateRange, normalizeGranularity } from '../utils/dateHelper.js';

const CACHE_TTL_OVERVIEW = 60; // seconds
const CACHE_TTL_SERIES = 300; // seconds

async function overview() {
  // Try cache first
  const cacheKey = 'analytics:overview:v1';
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    console.warn('Redis overview cache read error', err.message);
  }

  // Prefer aggregated daily_metrics for fast reads when possible (latest snapshot)
  const lastAgg = await AggregatedMetrics.findOne({ order: [['date', 'DESC']] });
  let result;
  if (lastAgg) {
    // Use aggregated snapshot combined with real-time counts for freshness
    const totalUsers = await User.count();
    const verifiedUsers = await User.count({ where: { kycStatus: 'verified' } });
    const pendingKyc = await User.count({ where: { kycStatus: { [Op.in]: ['unverified','pending','pending_review'] } } });
    const totalRequests = await ServiceRequest.count();
    const pendingRequests = await ServiceRequest.count({ where: { status: 'pending_review' } });
    const revenue = await Payment.sum('amount', { where: { status: 'success' } });

    result = {
      totalUsers,
      verifiedUsers,
      pendingKyc,
      totalRequests,
      pendingRequests,
      revenue: Number(revenue || 0),
      lastAggregated: lastAgg.date
    };
  } else {
    const totalUsers = await User.count();
    const verifiedUsers = await User.count({ where: { kycStatus: 'verified' } });
    const pendingKyc = await User.count({ where: { kycStatus: { [Op.in]: ['unverified','pending','pending_review'] } } });
    const totalRequests = await ServiceRequest.count();
    const pendingRequests = await ServiceRequest.count({ where: { status: 'pending_review' } });
    const revenue = await Payment.sum('amount', { where: { status: 'success' } });
    result = { totalUsers, verifiedUsers, pendingKyc, totalRequests, pendingRequests, revenue: Number(revenue || 0) };
  }

  try {
    await redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_OVERVIEW);
  } catch (err) {
    console.warn('Redis overview cache write error', err.message);
  }
  return result;
}

async function servicesBreakdown() {
  // Count requests per service category
  const services = await Service.findAll({ attributes: ['id', 'name', 'category', 'default_price'] });
  const result = [];
  for (const s of services) {
    const count = await ServiceRequest.count({ where: { serviceId: s.id } });
    result.push({ serviceId: s.id, name: s.name, category: s.category, count, defaultPrice: s.default_price });
  }
  return result;
}

function granularityToDateTrunc(granularity) {
  const g = normalizeGranularity(granularity);
  if (g === 'daily') return 'day';
  if (g === 'weekly') return 'week';
  if (g === 'monthly') return 'month';
  return 'day';
}

/**
 * Return a time-series of request counts between from/to with granularity
 */
async function getRequestsSeries({ from, to, granularity = 'daily' } = {}) {
  const { start, end } = toDateRange(from, to);
  const g = granularityToDateTrunc(granularity);
  const cacheKey = `analytics:requests:${g}:${start.toISOString().slice(0,10)}:${end.toISOString().slice(0,10)}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) { /* ignore */ }

  // Use aggregated table when granularity is daily and daily_metrics exists
  if (g === 'day') {
    const rows = await AggregatedMetrics.findAll({ where: { date: { [Op.between]: [start.toISOString().slice(0,10), end.toISOString().slice(0,10)] } }, order: [['date','ASC']] });
    if (rows && rows.length) {
      const series = rows.map(r => ({ date: r.date, count: Number(r.newRequests || 0) }));
      await redis.set(cacheKey, JSON.stringify(series), 'EX', CACHE_TTL_SERIES);
      return series;
    }
  }

  // Fallback: compute via DB grouping
  const trunc = fn('date_trunc', g, col('created_at'));
  const rows = await ServiceRequest.findAll({ attributes: [[trunc, 'period'], [fn('count', col('id')), 'count']], where: { createdAt: { [Op.between]: [start, end] } }, group: ['period'], order: [[literal('period'), 'ASC']] });
  const series = rows.map(r => ({ date: r.get('period'), count: Number(r.get('count')) }));
  try { await redis.set(cacheKey, JSON.stringify(series), 'EX', CACHE_TTL_SERIES); } catch (e) {}
  return series;
}

async function getRevenueSeries({ from, to, granularity = 'daily' } = {}) {
  const { start, end } = toDateRange(from, to);
  const g = granularityToDateTrunc(granularity);
  const cacheKey = `analytics:revenue:${g}:${start.toISOString().slice(0,10)}:${end.toISOString().slice(0,10)}`;
  try { const cached = await redis.get(cacheKey); if (cached) return JSON.parse(cached); } catch (e) {}

  if (g === 'day') {
    const rows = await AggregatedMetrics.findAll({ where: { date: { [Op.between]: [start.toISOString().slice(0,10), end.toISOString().slice(0,10)] } }, order: [['date','ASC']] });
    if (rows && rows.length) {
      const series = rows.map(r => ({ date: r.date, revenue: Number(r.newRevenue || 0) }));
      await redis.set(cacheKey, JSON.stringify(series), 'EX', CACHE_TTL_SERIES);
      return series;
    }
  }

  const trunc = fn('date_trunc', g, col('created_at'));
  const rows = await Payment.findAll({ attributes: [[trunc, 'period'], [fn('sum', col('amount')), 'sum_amount']], where: { status: 'success', createdAt: { [Op.between]: [start, end] } }, group: ['period'], order: [[literal('period'), 'ASC']] });
  const series = rows.map(r => ({ date: r.get('period'), revenue: Number(r.get('sum_amount') || 0) }));
  try { await redis.set(cacheKey, JSON.stringify(series), 'EX', CACHE_TTL_SERIES); } catch (e) {}
  return series;
}

async function invalidateOverviewCache() {
  try { await redis.del('analytics:overview:v1'); } catch (e) { /* ignore */ }
}

async function invalidateSeriesCacheForRange(start, end) {
  // conservative approach: flush specific keys pattern (best-effort)
  try {
    const pattern = `analytics:*:${start.slice(0,10)}*`;
    const keys = await redis.keys(pattern);
    if (keys && keys.length) await redis.del(...keys);
  } catch (e) { /* ignore */ }
}

async function paymentsSummary({ fromDate = null, toDate = null } = {}) {
  const where = {};
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt[Op.gte] = fromDate;
    if (toDate) where.createdAt[Op.lte] = toDate;
  }
  const totalRevenue = await Payment.sum('amount', { where: { ...where, status: 'success' } });
  const totalRefunds = await Payment.count({ where: { ...where, status: 'refunded' } });
  const totalPayments = await Payment.count({ where });
  return { totalRevenue: Number(totalRevenue || 0), totalRefunds, totalPayments };
}

async function dsaStats() {
  // DSAs are users with role 'dsa'
  const totalDsa = await User.count({ where: { role: 'dsa' } });
  // active DSAs
  const activeDsa = await User.count({ where: { role: 'dsa', verified: true } });
  return { totalDsa, activeDsa };
}

export default { overview, servicesBreakdown, paymentsSummary, dsaStats, getRequestsSeries, getRevenueSeries, invalidateOverviewCache, invalidateSeriesCacheForRange };
