import Joi from 'joi';
import User from '../../models/User.js';
import { Op } from 'sequelize';
import ServiceRequest from '../../models/ServiceRequest.js';
import Payment from '../../models/Payment.js';

// GET /api/v1/admin/users
export async function listUsers(req, res, next) {
  try {
    const schema = Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(200).default(25), search: Joi.string().allow('', null), filter: Joi.string().valid('active','verified','kyc_pending') });
    const { page, limit, search, filter } = await schema.validateAsync(req.query);

    const where = {};
    if (search) {
      where[Op.or] = [
        { fullName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (filter === 'active') where.isActive = true;
    if (filter === 'verified') where.kycStatus = 'verified';
    if (filter === 'kyc_pending') where.kycStatus = 'pending_review';

    // simple pagination
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({ where, offset, limit, order: [['created_at','DESC']] });
    return res.json({ total: count, page, limit, data: rows });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/users/:id
export async function getUserDetail(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const requestsCount = await ServiceRequest.count({ where: { userId: user.id } });
    const payments = await Payment.findAll({ where: { userId: user.id }, order: [['created_at','DESC']], limit: 50 });

    return res.json({ user, requestsCount, payments });
  } catch (err) { return next(err); }
}

// PATCH /api/v1/admin/users/:id/status
export async function updateUserStatus(req, res, next) {
  try {
    const schema = Joi.object({ isActive: Joi.boolean().required() });
    const { isActive } = await schema.validateAsync(req.body);
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const before = user.toJSON();
    user.isActive = isActive;
    await user.save();

    // log audit (middleware may have provided req.logAdminAction)
    if (req.logAdminAction) await req.logAdminAction({ action: 'update_user_status', afterData: user.toJSON(), remarks: `isActive=${isActive}` });

    return res.json({ user });
  } catch (err) { return next(err); }
}

// PATCH /api/v1/admin/users/:id/kyc
export async function verifyUserKyc(req, res, next) {
  try {
    const schema = Joi.object({ kycStatus: Joi.string().valid('verified','rejected').required(), remarks: Joi.string().allow('', null) });
    const { kycStatus, remarks } = await schema.validateAsync(req.body);
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const before = user.toJSON();
    user.kycStatus = kycStatus;
    await user.save();
    if (req.logAdminAction) await req.logAdminAction({ action: 'verify_kyc', afterData: user.toJSON(), remarks });

    return res.json({ user });
  } catch (err) { return next(err); }
}

export default { listUsers, getUserDetail, updateUserStatus, verifyUserKyc };
