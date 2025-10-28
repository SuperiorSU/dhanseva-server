import { verifyToken, authorizeRoles } from './authMiddleware.js';

// Middleware to ensure caller is an admin (or super_admin) and attach req.admin
export default function verifyAdmin(req, res, next) {
  // First verify token
  return verifyToken(req, res, (err) => {
    if (err) return; // verifyToken already sent response
    // use authorizeRoles to check role
    const guard = authorizeRoles('admin', 'super_admin');
    return guard(req, res, (err2) => {
      if (err2) return; // guard handled response
      // attach admin shorthand
      req.admin = req.user;
      return next();
    });
  });
}
