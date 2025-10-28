import Joi from 'joi';
import Payment from '../../models/Payment.js';
import { createRefund } from '../../services/razorpayAdminService.js';
import { enqueueNotification } from '../../services/queueService.js';

// GET /api/v1/admin/payments
export async function listPayments(req, res, next) {
  try {
    const schema = Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(200).default(25), status: Joi.string().valid('pending','success','failed','refunded').optional() });
    const { page, limit, status } = await schema.validateAsync(req.query);
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    const { count, rows } = await Payment.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']] });
    return res.json({ total: count, page, limit, data: rows });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/payments/:id
export async function getPaymentDetail(req, res, next) {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    return res.json({ payment });
  } catch (err) { return next(err); }
}

// POST /api/v1/admin/payments/:id/refund
export async function refundPayment(req, res, next) {
  try {
    const schema = Joi.object({ amount: Joi.number().positive().optional(), notes: Joi.object().optional() });
    const { amount, notes } = await schema.validateAsync(req.body);
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (!payment.paymentId) return res.status(400).json({ message: 'No provider payment id available' });

    // perform refund via Razorpay admin service
    const refund = await createRefund({ paymentId: payment.paymentId, amount: amount || Number(payment.amount), notes: notes || {} });
    payment.status = 'refunded';
    payment.meta = Object.assign({}, payment.meta || {}, { lastRefund: refund });
    await payment.save();

    if (req.logAdminAction) await req.logAdminAction({ action: 'refund_payment', afterData: { refund }, remarks: JSON.stringify(notes || {}) });

    // enqueue receipt/resend
    try { await enqueueNotification({ type: 'payment.refund', toUserId: payment.userId, payload: { paymentId: payment.id, refund } }); } catch (e) { console.error('enqueue notification failed', e); }

    return res.json({ payment, refund });
  } catch (err) { return next(err); }
}

// POST /api/v1/admin/payments/:id/resend-receipt
export async function resendReceipt(req, res, next) {
  try {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    await enqueueNotification({ type: 'payment.receipt', toUserId: payment.userId, payload: { paymentId: payment.id } });
    if (req.logAdminAction) await req.logAdminAction({ action: 'resend_receipt', entityId: payment.id });
    return res.json({ message: 'Receipt resend enqueued' });
  } catch (err) { return next(err); }
}

export default { listPayments, getPaymentDetail, refundPayment, resendReceipt };
