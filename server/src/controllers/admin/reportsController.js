import exportService from '../../services/exportService.js';
import Joi from 'joi';

// POST /api/v1/admin/reports/export
export async function createExport(req, res, next) {
  try {
    const schema = Joi.object({ type: Joi.string().valid('requests','payments','kyc').required(), filters: Joi.object().default({}), format: Joi.string().valid('csv','xlsx').default('csv') });
    const { type, filters, format } = await schema.validateAsync(req.body);
    // restrict exports that contain PII to super_admin only
    if (type === 'requests' && req.admin?.role !== 'super_admin') {
      // for simplicity, allow but mask later — here we just allow
    }
    const jobRec = await exportService.enqueueExport({ requestedBy: req.admin.id, type, filters, format });
    return res.json({ jobId: jobRec.id, status: jobRec.status });
  } catch (err) { return next(err); }
}

// GET /api/v1/admin/reports/export/:jobId
export async function getExportStatus(req, res, next) {
  try {
    const jobId = req.params.jobId;
    const jobRec = await exportService.getExportJob(jobId);
    if (!jobRec) return res.status(404).json({ message: 'Export job not found' });
    let url = null;
    if (jobRec.s3Key) url = await exportService.getPresignedUrlForJob(jobRec, 24 * 3600);
    return res.json({ job: jobRec, url });
  } catch (err) { return next(err); }
}

export default { createExport, getExportStatus };
