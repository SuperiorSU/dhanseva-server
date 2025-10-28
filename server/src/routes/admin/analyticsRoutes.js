import express from 'express';
import verifyAdmin from '../../middleware/verifyAdmin.js';
import * as analyticsController from '../../controllers/admin/analyticsController.js';
import * as reportsController from '../../controllers/admin/reportsController.js';

const router = express.Router();
router.use(verifyAdmin);

// Analytics
router.get('/analytics/overview', analyticsController.overview);
router.get('/analytics/requests', analyticsController.requestsSeries);
router.get('/analytics/revenue', analyticsController.revenueSeries);
router.get('/analytics/dsa-performance', analyticsController.dsaPerformance);

// Reports & Exports
router.post('/reports/export', reportsController.createExport);
router.get('/reports/export/:jobId', reportsController.getExportStatus);

export default router;
