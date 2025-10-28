import Joi from 'joi';
import ServiceRequest from '../../models/ServiceRequest.js';
import User from '../../models/User.js';
import { enqueueNotification } from '../../services/queueService.js';
import * as templateService from '../../services/templateService.js';

// GET /api/v1/admin/requests
export async function listRequests(req, res, next) {
  try {
    const schema = Joi.object({ page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(200).default(25), status: Joi.string().allow('', null) });
    const { page, limit, status } = await schema.validateAsync(req.query);
    const offset = (page - 1) * limit;
    const where = {};
    if (status) where.status = status;
    const { count, rows } = await ServiceRequest.findAndCountAll({ where, limit, offset, order: [['created_at','DESC']], include: [{ model: User, as: 'user', attributes: ['id','full_name','email'] }] });
    return res.json({ total: count, page, limit, data: rows });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/requests/:id
export async function getRequestDetail(req, res, next) {
  try {
    const reqRec = await ServiceRequest.findByPk(req.params.id, { include: [{ model: User, as: 'user' }] });
    if (!reqRec) return res.status(404).json({ message: 'Request not found' });
    const attachments = reqRec.documentUrls || [];
    return res.json({ request: reqRec, attachments });
  } catch (err) { return next(err); }
}

// PATCH /api/v1/admin/requests/:id/status
export async function updateRequestStatus(req, res, next) {
  try {
    const schema = Joi.object({ status: Joi.string().required(), adminRemark: Joi.string().allow('', null) });
    const { status, adminRemark } = await schema.validateAsync(req.body);
    const reqRec = await ServiceRequest.findByPk(req.params.id, { include: [{ model: User, as: 'user' }] });
    if (!reqRec) return res.status(404).json({ message: 'Request not found' });
    const before = reqRec.toJSON();
    reqRec.status = status;
    if (adminRemark) reqRec.adminNotes = adminRemark;
    await reqRec.save();

    // Log via middleware helper if available
    if (req.logAdminAction) await req.logAdminAction({ action: 'update_request_status', afterData: reqRec.toJSON(), remarks: adminRemark });

    // Send notification to user (enqueue)
    try {
      const payload = { userId: reqRec.userId, requestId: reqRec.id, status };
      // use a standard template key if exists
      const tpl = await templateService.getTemplate('request.status_change');
      if (tpl) {
        await enqueueNotification({ type: 'request_status_change', toUserId: reqRec.userId, templateKey: 'request.status_change', payload });
      } else {
        await enqueueNotification({ type: 'request_status_change', toUserId: reqRec.userId, payload });
      }
    } catch (err) {
      console.error('Failed to enqueue notification', err);
    }

    return res.json({ request: reqRec });
  } catch (err) { return next(err); }
}

// POST /api/v1/admin/requests/:id/remark
export async function addAdminRemark(req, res, next) {
  try {
    const schema = Joi.object({ remark: Joi.string().required() });
    const { remark } = await schema.validateAsync(req.body);
    const reqRec = await ServiceRequest.findByPk(req.params.id);
    if (!reqRec) return res.status(404).json({ message: 'Request not found' });
    const before = reqRec.toJSON();
    reqRec.adminNotes = (reqRec.adminNotes || '') + `\n[${new Date().toISOString()}][${req.admin?.id || 'admin'}] ${remark}`;
    await reqRec.save();
    if (req.logAdminAction) await req.logAdminAction({ action: 'add_request_remark', afterData: reqRec.toJSON(), remarks: remark });
    return res.json({ request: reqRec });
  } catch (err) { return next(err); }
}

// POST /api/v1/admin/requests/:id/notify
export async function notifyUser(req, res, next) {
  try {
    const schema = Joi.object({ templateKey: Joi.string().required(), payload: Joi.object().default({}) });
    const { templateKey, payload } = await schema.validateAsync(req.body);
    const reqRec = await ServiceRequest.findByPk(req.params.id);
    if (!reqRec) return res.status(404).json({ message: 'Request not found' });
    await enqueueNotification({ type: 'manual_admin_notification', toUserId: reqRec.userId, templateKey, payload });
    if (req.logAdminAction) await req.logAdminAction({ action: 'admin_notify_user', entityId: reqRec.id, afterData: payload, remarks: `template=${templateKey}` });
    return res.json({ message: 'Notification enqueued' });
  } catch (err) { return next(err); }
}

export default { listRequests, getRequestDetail, updateRequestStatus, addAdminRemark, notifyUser };
