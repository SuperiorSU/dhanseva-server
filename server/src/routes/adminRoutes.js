import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { rateLimiterAdmin } from '../middleware/rateLimiterAdmin.js';

import { listUsers, getUser, updateUser, softDeleteUser, verifyKyc } from '../controllers/adminController.js';
import { listAdminRequests, getAdminRequest, updateRequestStatus, forwardToBank } from '../controllers/requestsAdminController.js';
import { listPayments, reconcilePayment, refundPayment } from '../controllers/paymentsAdminController.js';
import { summaryReport, exportRequests } from '../controllers/reportsController.js';

const router = express.Router();

// Users management
router.get('/users', verifyToken, authorizeRoles('admin'), listUsers);
router.get('/users/:id', verifyToken, authorizeRoles('admin'), getUser);
router.put('/users/:id', verifyToken, authorizeRoles('admin'), updateUser);
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), softDeleteUser);
router.post('/users/:id/verify', verifyToken, authorizeRoles('admin'), verifyKyc);

// DSA management routes could be scoped to /dsas - reuse users endpoints with role filter
router.get('/dsas', verifyToken, authorizeRoles('admin'), (req, res, next) => {
  req.query.role = 'dsa';
  return listUsers(req, res, next);
});

router.put('/dsas/:id', verifyToken, authorizeRoles('admin'), updateUser);
router.post('/dsas/:id/suspend', verifyToken, authorizeRoles('admin'), (req, res, next) => updateUser({ ...req, body: { isActive: false } }, res, next));

// Requests
router.get('/requests', verifyToken, authorizeRoles('admin'), listAdminRequests);
router.get('/requests/:id', verifyToken, authorizeRoles('admin'), getAdminRequest);
router.put('/requests/:id/status', verifyToken, authorizeRoles('admin'), updateRequestStatus);
router.post('/requests/:id/forward', verifyToken, authorizeRoles('admin'), rateLimiterAdmin, forwardToBank);

// Payments
router.get('/payments', verifyToken, authorizeRoles('admin'), listPayments);
router.post('/payments/reconcile', verifyToken, authorizeRoles('admin'), rateLimiterAdmin, reconcilePayment);
router.post('/payments/:id/refund', verifyToken, authorizeRoles('admin'), rateLimiterAdmin, refundPayment);

// Reports
router.get('/reports/summary', verifyToken, authorizeRoles('admin'), summaryReport);
router.get('/reports/requests/export', verifyToken, authorizeRoles('admin'), exportRequests);

export default router;
