import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { userUpdateSchema, verifyKycSchema } from '../validation/adminValidations.js';

export async function listUsers(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.kycStatus = req.query.status;
    if (req.query.search) {
      const s = req.query.search;
      where.fullName = { [Symbol.for('like')] : `%${s}%` };
    }

    const { count, rows } = await User.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']] });
    return res.json({ total: count, page, limit, items: rows });
  } catch (err) { return next(err); }
}

export async function getUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    // mask sensitive fields
    const data = user.toJSON();
    delete data.passwordHash;
    return res.json({ user: data });
  } catch (err) { return next(err); }
}

export async function updateUser(req, res, next) {
  try {
    const { error, value } = userUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.update(value);
    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'update_user', targetType: 'user', targetId: user.id, details: value });
    return res.json({ user });
  } catch (err) { return next(err); }
}

export async function softDeleteUser(req, res, next) {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    // set deleted_at manually
    await user.update({ isActive: false, deletedAt: new Date() }, { silent: true });
    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'soft_delete_user', targetType: 'user', targetId: user.id, details: {} });
    return res.json({ message: 'User soft-deleted' });
  } catch (err) { return next(err); }
}

export async function verifyKyc(req, res, next) {
  try {
    const { error, value } = verifyKycSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Not found' });
    await user.update({ kycStatus: value.status });
    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'verify_kyc', targetType: 'user', targetId: user.id, details: { status: value.status, adminNotes: value.adminNotes } });
    return res.json({ message: 'KYC updated' });
  } catch (err) { return next(err); }
}
