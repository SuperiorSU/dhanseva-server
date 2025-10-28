import Payment from '../models/Payment.js';
import Refund from '../models/Refund.js';
import AuditLog from '../models/AuditLog.js';
import { reconcileSchema, refundSchema } from '../validation/adminValidations.js';
import { fetchPayment, createRefund } from '../services/razorpayAdminService.js';
import { sendMail } from '../services/mailer.js';

export async function listPayments(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.userId) where.userId = req.query.userId;
    const { count, rows } = await Payment.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']] });
    return res.json({ total: count, page, limit, items: rows });
  } catch (err) { return next(err); }
}

export async function reconcilePayment(req, res, next) {
  try {
    const { error, value } = reconcileSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const { razorpay_order_id } = value;
    const resp = await fetchPayment(razorpay_order_id);
    // resp contains payments list
    const payments = resp.items || resp;
    // Compare with local
    const local = await Payment.findOne({ where: { orderId: razorpay_order_id } });
    const discrepancies = [];
    if (!local) discrepancies.push('no_local_record');
    else {
      // compare status
      const remoteStatus = payments && payments.length ? payments[0].status : null;
      if (remoteStatus && remoteStatus !== local.status) discrepancies.push({ local: local.status, remote: remoteStatus });
      // update local if necessary
      if (remoteStatus && remoteStatus !== local.status) {
        local.status = remoteStatus === 'captured' ? 'success' : 'failed';
        await local.save();
      }
    }

    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'reconcile_payment', targetType: 'payment', targetId: local ? local.id : null, details: { razorpay_order_id, discrepancies } });

    return res.json({ payments: payments, discrepancies });
  } catch (err) { return next(err); }
}

export async function refundPayment(req, res, next) {
  try {
    const { error, value } = refundSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });

    // create local refund record
    const refundRec = await Refund.create({ paymentId: payment.id, adminId: req.user.id, amount: value.amount, reason: value.reason, status: 'requested' });

    try {
      const refundResp = await createRefund({ paymentId: payment.paymentId, amount: value.amount, notes: { admin: req.user.id, reason: value.reason } });
      refundRec.razorpayRefundId = refundResp.id || refundResp.entity?.id;
      refundRec.status = 'processed';
      await refundRec.save();

      // notify user
      try { await sendMail({ to: payment.user_email || '', subject: 'Refund processed', text: `Refund for payment ${payment.id} processed.` }); } catch (e) {}

      await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'refund_payment', targetType: 'payment', targetId: payment.id, details: { refundId: refundRec.id } });

      return res.json({ refund: refundRec, razorpay: refundResp });
    } catch (err) {
      refundRec.status = 'failed';
      await refundRec.save();
      await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'refund_failed', targetType: 'payment', targetId: payment.id, details: { error: err.message } });
      return res.status(500).json({ message: 'Refund failed', error: err.message });
    }
  } catch (err) { return next(err); }
}
