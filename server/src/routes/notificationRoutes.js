import express from 'express';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';
import { previewTemplate, enqueue, listNotifications, resendNotification, listTemplatesController, upsertTemplateController, deactivateTemplateController } from '../controllers/notificationController.js';
import { rateLimiterAdmin } from '../middleware/rateLimiterAdmin.js';

const router = express.Router();

// Preview (admin/dev)
router.post('/preview', verifyToken, authorizeRoles('admin'), previewTemplate);

// Enqueue - internal/called by other services; protect with token or allow service JWT
router.post('/enqueue', verifyToken, enqueue);

// Admin endpoints
router.get('/admin', verifyToken, authorizeRoles('admin'), listNotifications);
router.post('/admin/:id/resend', verifyToken, authorizeRoles('admin'), rateLimiterAdmin, resendNotification);

// Templates
router.get('/admin/templates', verifyToken, authorizeRoles('admin'), listTemplatesController);
router.post('/admin/templates', verifyToken, authorizeRoles('admin'), upsertTemplateController);
router.delete('/admin/templates/:key', verifyToken, authorizeRoles('admin'), deactivateTemplateController);

export default router;
