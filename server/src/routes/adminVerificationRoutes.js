import express from 'express';
import { adminListVerifications, adminUpdateVerification } from '../controllers/verificationController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/list', verifyToken, authorizeRoles('admin'), adminListVerifications);
router.put('/:id', verifyToken, authorizeRoles('admin'), adminUpdateVerification);

export default router;
