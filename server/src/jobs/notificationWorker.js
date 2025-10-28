import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import Notification from '../models/Notification.js';
import { renderTemplate } from '../services/templateService.js';
import { sendEmail } from '../services/mailerService.js';
import { sendSMS } from '../services/smsService.js';
import { sendWhatsApp, prefillWhatsAppMessage } from '../services/whatsappService.js';
import AuditLog from '../models/AuditLog.js';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

const worker = new Worker('notifications', async job => {
  const data = job.data;
  // data: { channel, templateKey, locale, recipient, payload, notificationId }
  const { channel, templateKey, locale = 'en_IN', recipient, payload, notificationId, idempotencyKey } = data;

  // render template
  let rendered;
  try {
    rendered = await renderTemplate(templateKey, locale, payload || {});
  } catch (err) {
    await Notification.update({ status: 'failed', lastError: err.message }, { where: { id: notificationId } });
    throw err;
  }

  // update notification with body/subject
  await Notification.update({ body: rendered.body, subject: rendered.subject, status: 'sending' }, { where: { id: notificationId } });

  try {
    let result;
    if (channel === 'email') {
      result = await sendEmail({ to: recipient.email, subject: rendered.subject, html: rendered.body });
    } else if (channel === 'sms') {
      result = await sendSMS({ to: recipient.phone, body: rendered.body });
    } else if (channel === 'whatsapp') {
      const sendRes = await sendWhatsApp({ toPhone: recipient.phone, message: rendered.body });
      result = sendRes;
    }

    await Notification.update({ status: 'sent' }, { where: { id: notificationId } });
    await AuditLog.create({ actorId: data.createdBy || null, actorRole: 'system', action: 'send_notification', targetType: 'notification', targetId: notificationId, details: { channel, recipient, idempotencyKey, result } });
    return { ok: true, result };
  } catch (err) {
    // increment retries and set lastError
    const n = await Notification.findByPk(notificationId);
    const retries = (n.retries || 0) + 1;
    const update = { retries, lastError: err.message };
    if (retries >= 5) update.status = 'failed';
    await Notification.update(update, { where: { id: notificationId } });
    await AuditLog.create({ actorId: data.createdBy || null, actorRole: 'system', action: 'send_notification_failed', targetType: 'notification', targetId: notificationId, details: { error: err.message } });
    throw err;
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error('Notification job failed', job.id, err.message);
});

export default worker;
