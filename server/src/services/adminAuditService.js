import AuditLog from '../models/AuditLog.js';

async function logAction({ adminId, entityType = null, entityId = null, action, beforeData = null, afterData = null, remarks = null, ipAddress = null }) {
  if (!adminId) {
    console.warn('adminAuditService.logAction called without adminId');
  }

  const rec = await AuditLog.create({
    adminId,
    entityType,
    entityId,
    action,
    beforeData,
    afterData,
    remarks,
    ipAddress
  });

  return rec;
}

export default { logAction };
