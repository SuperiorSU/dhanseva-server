import cron from 'node-cron';
import { Op, fn, col } from 'sequelize';
import AggregatedMetrics from '../models/AggregatedMetrics.js';
import User from '../models/User.js';
import ServiceRequest from '../models/ServiceRequest.js';
import Payment from '../models/Payment.js';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import adminAuditService from '../services/adminAuditService.js';

/**
 * Computes metrics for the previous day and upserts into daily_metrics table.
 * This function can be invoked by a cron schedule or a job runner.
 */
export async function aggregateForDate(date = null) {
  // if no date passed, aggregate for yesterday
  const target = date ? new Date(date) : subDays(new Date(), 1);
  const start = startOfDay(target);
  const end = endOfDay(target);

  const totalUsers = await User.count();
  const newUsers = await User.count({ where: { createdAt: { [Op.between]: [start, end] } } });
  const totalRequests = await ServiceRequest.count();
  const newRequests = await ServiceRequest.count({ where: { createdAt: { [Op.between]: [start, end] } } });
  const totalRevenue = await Payment.sum('amount', { where: { status: 'success' } });
  const newRevenue = await Payment.sum('amount', { where: { status: 'success', createdAt: { [Op.between]: [start, end] } } });
  const pendingKyc = await User.count({ where: { kycStatus: { [Op.in]: ['pending','pending_review'] } } });

  await AggregatedMetrics.upsert({ date: start.toISOString().slice(0,10), totalUsers, newUsers, totalRequests, newRequests, totalRevenue: Number(totalRevenue || 0), newRevenue: Number(newRevenue || 0), pendingKyc });
  return true;
}

// Cron schedule: run daily at 00:30 server time (adjust as needed)
export function scheduleDailyAggregation() {
  cron.schedule('30 0 * * *', async () => {
    try {
      await aggregateForDate();
      console.log('Daily aggregation job completed');
    } catch (err) {
      console.error('Daily aggregation failed', err);
    }
  }, { scheduled: true });
}

export default { aggregateForDate, scheduleDailyAggregation };
