import { previewSchema, enqueueSchema } from '../validation/notificationValidation.js';
import { renderTemplate } from '../services/templateService.js';
import Notification from '../models/Notification.js';
import { enqueueNotification } from '../services/queueService.js';
import { notificationQueue } from '../services/queueService.js';
import { Op } from 'sequelize';
import { maskString } from '../utils/maskUtils.js';
import Template from '../models/Template.js';

// Admin preview (requires admin or dev)
export async function previewTemplate(req, res, next) {
  try {
    const { error, value } = previewSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const { templateKey, locale = 'en_IN', payload } = value;
    const rendered = await renderTemplate(templateKey, locale, payload);
    return res.json({ subject: rendered.subject, body: rendered.body });
  } catch (err) { return next(err); }
}

// Internal enqueue endpoint - guarded by internal auth in router
export async function enqueue(req, res, next) {
  try {
    const { error, value } = enqueueSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { channel, templateKey, locale, recipient, payload, idempotencyKey, createdBy } = value;

    // idempotency check
    if (idempotencyKey) {
      const existing = await Notification.findOne({ where: { idempotencyKey, templateKey, status: { [Op.in]: ['queued','sending','sent'] }, recipient: recipient } });
      if (existing) return res.json({ notificationId: existing.id, duplicate: true });
    }

    // render subject/body for audit (ensure template exists and placeholders ok)
    const rendered = await renderTemplate(templateKey, locale, payload);

    // mask sensitive fields in payload before storing if not admin
    const bodyForStore = rendered.body;

    const notif = await Notification.create({ channel, templateKey, locale, recipient, payload, body: bodyForStore, subject: rendered.subject, status: 'queued', idempotencyKey, createdBy });

    // priority for payment/refund templates
    const priority = ['payment_success','refund_processed'].includes(templateKey) ? 1 : 2;
    const jobId = await enqueueNotification({ channel, templateKey, locale, recipient, payload, notificationId: notif.id, createdBy, idempotencyKey }, { priority });
    return res.json({ notificationId: notif.id, jobId });
  } catch (err) { return next(err); }
}

// Admin: list notifications with filters
export async function listNotifications(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    const offset = (page - 1) * limit;
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.channel) where.channel = req.query.channel;
    if (req.query.templateKey) where.templateKey = req.query.templateKey;
    if (req.query.recipient) where['recipient'] = { [Op.contains]: JSON.parse(req.query.recipient) };

    const { count, rows } = await Notification.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']] });
    // mask PII for non-super-admins
    const items = rows.map(r => {
      const obj = r.toJSON();
      if (!req.user || req.user.role !== 'admin') {
        if (obj.recipient && obj.recipient.email) obj.recipient.email = maskString(obj.recipient.email);
        if (obj.recipient && obj.recipient.phone) obj.recipient.phone = maskString(obj.recipient.phone);
      }
      return obj;
    });
    return res.json({ total: count, page, limit, items });
  } catch (err) { return next(err); }
}

export async function resendNotification(req, res, next) {
  try {
    const id = req.params.id;
    const notif = await Notification.findByPk(id);
    if (!notif) return res.status(404).json({ message: 'Not found' });
    const jobId = await enqueueNotification({ channel: notif.channel, templateKey: notif.templateKey, locale: notif.locale, recipient: notif.recipient, payload: notif.payload, notificationId: notif.id, createdBy: req.user.id });
    await notif.update({ status: 'queued' });
    return res.json({ jobId });
  } catch (err) { return next(err); }
}

export async function listTemplatesController(req, res, next) {
  try {
    const tpl = await Template.findAll({ where: { isActive: true } });
    return res.json({ items: tpl });
  } catch (err) { return next(err); }
}

export async function upsertTemplateController(req, res, next) {
  try {
    const { key, locale = 'en_IN', subjectTemplate, bodyTemplate, isActive = true } = req.body;
    if (!key || !subjectTemplate || !bodyTemplate) return res.status(400).json({ message: 'key, subjectTemplate and bodyTemplate are required' });
    const [tpl] = await Template.upsert({ key, locale, subjectTemplate, bodyTemplate, isActive });
    return res.json({ template: tpl });
  } catch (err) { return next(err); }
}

export async function deactivateTemplateController(req, res, next) {
  try {
    const key = req.params.key;
    const tpl = await Template.findOne({ where: { key } });
    if (!tpl) return res.status(404).json({ message: 'Not found' });
    tpl.isActive = false; await tpl.save();
    return res.json({ message: 'Template deactivated' });
  } catch (err) { return next(err); }
}
