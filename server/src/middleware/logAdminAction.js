import adminAuditService from '../services/adminAuditService.js';

/**
 * Factory middleware to capture before state and provide logging helper
 * Usage: app.patch('/.../:id', adminActionLogger({ model: User, idParam: 'id', entityType: 'user' }), handler)
 */
export function adminActionLogger({ model = null, idParam = 'id', entityType = null } = {}) {
  return async (req, res, next) => {
    try {
      req._admin_before = req._admin_before || {};
      const id = req.params[idParam];
      if (model && id) {
        const before = await model.findByPk(id);
        req._admin_before[entityType || model.name] = before ? before.toJSON() : null;
      }

      // helper for controllers to write audit after performing action
      req.logAdminAction = async ({ action, entityId = req.params[idParam], afterData = null, remarks = null }) => {
        try {
          const adminId = req.admin && req.admin.id ? req.admin.id : null;
          const beforeData = req._admin_before[entityType || model?.name] || null;
          await adminAuditService.logAction({ adminId, entityType: entityType || model?.name || null, entityId, action, beforeData, afterData, remarks, ipAddress: req.ip });
        } catch (err) {
          // don't block main flow on audit failure, but log to console
          console.error('Failed to write admin audit', err);
        }
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
