import User from '../models/User.js';
import Payment from '../models/Payment.js';
import ServiceRequest from '../models/ServiceRequest.js';
import sequelize from '../db.js';

export async function summaryReport(req, res, next) {
  try {
    const totalUsers = await User.count();
    const new7 = await User.count({ where: { createdAt: { [sequelize.Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } });
    const new30 = await User.count({ where: { createdAt: { [sequelize.Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } });
    const totalRevenueRaw = await Payment.sum('amount', { where: { status: 'success' } });
    const totalRevenue = Number(totalRevenueRaw || 0);
    const paymentsByStatus = await Payment.findAll({ attributes: ['status', [sequelize.fn('count', sequelize.col('status')), 'count']], group: ['status'] });
    const requestsByStatus = await ServiceRequest.findAll({ attributes: ['status', [sequelize.fn('count', sequelize.col('status')), 'count']], group: ['status'] });

    return res.json({ totalUsers, new7, new30, totalRevenue, paymentsByStatus, requestsByStatus });
  } catch (err) { return next(err); }
}

export async function exportRequests(req, res, next) {
  try {
    // For brevity return JSON and note that CSV generation + S3 presigned link should be added
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const items = await ServiceRequest.findAll({ where, include: ['service','user'] });
    // In production generate CSV, upload to S3 and return presigned URL
    return res.json({ items });
  } catch (err) { return next(err); }
}
