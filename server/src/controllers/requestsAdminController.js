import ServiceRequest from '../models/ServiceRequest.js';
import AuditLog from '../models/AuditLog.js';
import BankForward from '../models/BankForward.js';
import { forwardSchema } from '../validation/adminValidations.js';
import { sendMail } from '../services/mailer.js';
import { generatePresignedUploadUrl } from '../services/s3Service.js';
import { prefillWhatsAppMessage, sendWhatsApp } from '../services/whatsappService.js';
import Service from '../models/Service.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';

function buildWhereFromQuery(q) {
  const where = {};
  if (q.status) where.status = q.status;
  if (q.serviceId) where.serviceId = q.serviceId;
  if (q.userId) where.userId = q.userId;
  if (q.paymentStatus) where['$payment.status$'] = q.paymentStatus;
  return where;
}

export async function listAdminRequests(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const offset = (page - 1) * limit;
    const where = buildWhereFromQuery(req.query);

    const { count, rows } = await ServiceRequest.findAndCountAll({
      where,
      include: [{ model: Service, as: 'service' }, { model: User, as: 'user' }, { model: Payment, as: 'payment', required: false }],
      limit,
      offset,
      order: [['created_at','DESC']]
    });
    return res.json({ total: count, page, limit, items: rows });
  } catch (err) { return next(err); }
}

export async function getAdminRequest(req, res, next) {
  try {
    const id = req.params.id;
    const reqRec = await ServiceRequest.findByPk(id, { include: [{ model: Service, as: 'service' }, { model: User, as: 'user' }] });
    if (!reqRec) return res.status(404).json({ message: 'Not found' });
    // fetch audit logs for this request
    const logs = await AuditLog.findAll({ where: { targetType: 'request', targetId: id }, order: [['created_at','ASC']] });

    // generate pre-signed download URLs for attachments if any
    const attachments = (reqRec.documentUrls || []).map(u => u); // assume uploaded S3 keys or URLs

    return res.json({ request: reqRec, audit: logs, attachments });
  } catch (err) { return next(err); }
}

export async function updateRequestStatus(req, res, next) {
  try {
    const id = req.params.id;
    const { status, adminNotes } = req.body;
    if (!['pending_review','in_progress','completed','rejected','processing'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const reqRec = await ServiceRequest.findByPk(id);
    if (!reqRec) return res.status(404).json({ message: 'Not found' });
    const old = reqRec.status;
    reqRec.status = status;
    if (adminNotes) reqRec.adminNotes = adminNotes;
    await reqRec.save();

    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'update_request_status', targetType: 'request', targetId: id, details: { from: old, to: status, adminNotes } });

    // notify user
    const user = await User.findByPk(reqRec.userId);
    try { await sendMail({ to: user.email, subject: 'Service Request Status Updated', text: `Your service request ${id} status changed to ${status}` }); } catch (e) {}

    return res.json({ request: reqRec });
  } catch (err) { return next(err); }
}

export async function forwardToBank(req, res, next) {
  try {
    const { error, value } = forwardSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const id = req.params.id;
    const reqRec = await ServiceRequest.findByPk(id);
    if (!reqRec) return res.status(404).json({ message: 'Not found' });

    const attachments = reqRec.documentUrls || [];
    const bf = await BankForward.create({ requestId: id, forwardedBy: req.user.id, recipients: value.recipients, message: value.message, attachments, method: value.method, status: 'queued' });

    let sendResult = null;
    if (value.method === 'email') {
      // for each recipient, send an email (best-effort)
      try {
        for (const r of value.recipients) {
          await sendMail({ to: r.email, subject: `Forwarded service request ${id}`, text: value.message, html: `<p>${value.message}</p>` });
        }
        bf.status = 'sent'; bf.sentAt = new Date(); await bf.save();
        sendResult = { ok: true };
      } catch (err) {
        bf.status = 'failed'; await bf.save();
        sendResult = { ok: false, error: err.message };
      }
    } else if (value.method === 'whatsapp') {
      // attempt to send or return prefilled payloads
      const payload = prefillWhatsAppMessage({ recipients: value.recipients, message: value.message, attachments });
      const sendRes = await sendWhatsApp({ toPhone: value.recipients[0].phone, message: payload.text });
      bf.status = sendRes.ok ? 'sent' : 'failed'; bf.sentAt = sendRes.ok ? new Date() : null; await bf.save();
      sendResult = { ok: sendRes.ok, payload };
    } else {
      // manual
      bf.status = 'queued'; await bf.save();
      sendResult = { ok: true, manual: true };
    }

    await AuditLog.create({ actorId: req.user.id, actorRole: req.user.role, action: 'forward_request', targetType: 'request', targetId: id, details: { method: value.method, recipients: value.recipients } });

    return res.json({ bankForward: bf, sendResult });
  } catch (err) { return next(err); }
}
