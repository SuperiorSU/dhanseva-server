import express from 'express';
import verifyAdmin from '../../middleware/verifyAdmin.js';
import { adminActionLogger } from '../../middleware/logAdminAction.js';

import * as userAdmin from '../../controllers/admin/userAdminController.js';
import * as requestAdmin from '../../controllers/admin/requestAdminController.js';
import * as paymentAdmin from '../../controllers/admin/paymentAdminController.js';
import * as analyticsAdmin from '../../controllers/admin/analyticsAdminController.js';
import Document from '../../models/Document.js';
import User from '../../models/User.js';
import ServiceRequest from '../../models/ServiceRequest.js';
import Payment from '../../models/Payment.js';
import documentService from '../../services/documentService.js';

const router = express.Router();

// Apply admin check to all admin routes
router.use(verifyAdmin);

// Users
router.get('/users', userAdmin.listUsers);
router.get('/users/:id', userAdmin.getUserDetail);
router.patch('/users/:id/status', adminActionLogger({ model: User, idParam: 'id', entityType: 'user' }), userAdmin.updateUserStatus);
router.patch('/users/:id/kyc', adminActionLogger({ model: User, idParam: 'id', entityType: 'user' }), userAdmin.verifyUserKyc);

// DSA endpoints (reuse users endpoints but filtered)
router.get('/dsa', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, approved } = req.query;
    const where = { role: 'dsa' };
    if (approved === 'true') where.verified = true;
    if (approved === 'false') where.verified = false;
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({ where, limit: Number(limit), offset, order: [['created_at','DESC']] });
    return res.json({ total: count, page: Number(page), limit: Number(limit), data: rows });
  } catch (err) { return next(err); }
});

router.patch('/dsa/:id/verify', adminActionLogger({ model: User, idParam: 'id', entityType: 'dsa' }), async (req, res, next) => {
  try {
    const { approve } = req.body; // boolean
    const dsa = await User.findByPk(req.params.id);
    if (!dsa) return res.status(404).json({ message: 'DSA not found' });
    dsa.verified = !!approve;
    await dsa.save();
    if (req.logAdminAction) await req.logAdminAction({ action: approve ? 'approve_dsa' : 'reject_dsa', afterData: dsa.toJSON() });
    return res.json({ dsa });
  } catch (err) { return next(err); }
});

// Service Requests
router.get('/requests', requestAdmin.listRequests);
router.get('/requests/:id', requestAdmin.getRequestDetail);
router.patch('/requests/:id/status', adminActionLogger({ model: ServiceRequest, idParam: 'id', entityType: 'request' }), requestAdmin.updateRequestStatus);
router.post('/requests/:id/remark', adminActionLogger({ model: ServiceRequest, idParam: 'id', entityType: 'request' }), requestAdmin.addAdminRemark);
router.post('/requests/:id/notify', adminActionLogger({ model: ServiceRequest, idParam: 'id', entityType: 'request' }), requestAdmin.notifyUser);

// Payments
router.get('/payments', paymentAdmin.listPayments);
router.get('/payments/:id', paymentAdmin.getPaymentDetail);
router.post('/payments/:id/refund', adminActionLogger({ model: Payment, idParam: 'id', entityType: 'payment' }), paymentAdmin.refundPayment);
router.post('/payments/:id/resend-receipt', adminActionLogger({ model: Payment, idParam: 'id', entityType: 'payment' }), paymentAdmin.resendReceipt);

// Documents
router.get('/documents/:userId', async (req, res, next) => {
  try {
    const docs = await documentService.getUserDocuments(req.params.userId);
    return res.json({ data: docs });
  } catch (err) { return next(err); }
});

router.patch('/documents/:docId/verify', adminActionLogger({ model: Document, idParam: 'docId', entityType: 'document' }), async (req, res, next) => {
  try {
    const doc = await documentService.markVerified(req.params.docId, req.admin?.id);
    if (req.logAdminAction) await req.logAdminAction({ action: 'verify_document', entityId: doc.id, afterData: doc.toJSON() });
    return res.json({ document: doc });
  } catch (err) { return next(err); }
});

router.get('/documents/:docId/presign', adminActionLogger({ model: Document, idParam: 'docId', entityType: 'document' }), async (req, res, next) => {
  try {
    const doc = await documentService.getDocumentById(req.params.docId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const url = await documentService.presign(doc, { expiresSeconds: 300 });
    if (req.logAdminAction) await req.logAdminAction({ action: 'presign_document', entityId: doc.id });
    return res.json({ url });
  } catch (err) { return next(err); }
});

// Analytics
router.get('/analytics/overview', analyticsAdmin.overview);
router.get('/analytics/services', analyticsAdmin.services);
router.get('/analytics/payments', analyticsAdmin.payments);
router.get('/analytics/dsa', analyticsAdmin.dsa);

// Audit logs listing - lightweight
import AuditLog from '../../models/AuditLog.js';
import { Op } from 'sequelize';
router.get('/audit', async (req, res, next) => {
  try {
    const { entity_type, admin_id, from, to, page = 1, limit = 50 } = req.query;
    const where = {};
    if (entity_type) where.entityType = entity_type;
    if (admin_id) where.adminId = admin_id;
    if (from || to) where.createdAt = {};
    if (from) where.createdAt[Op.gte] = from;
    if (to) where.createdAt[Op.lte] = to;
    const offset = (page - 1) * limit;
    const { count, rows } = await AuditLog.findAndCountAll({ where, limit: Number(limit), offset, order: [['created_at','DESC']] });
    return res.json({ total: count, page: Number(page), limit: Number(limit), data: rows });
  } catch (err) { return next(err); }
});

export default router;
