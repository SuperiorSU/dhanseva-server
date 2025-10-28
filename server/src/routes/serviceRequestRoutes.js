import express from 'express';
import { createRequest, listRequests, getRequest, adminUpdateStatus } from '../controllers/serviceRequestController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, authorizeRoles('user','dsa'), createRequest);
router.get('/', verifyToken, authorizeRoles('user','dsa','admin'), listRequests);
router.get('/:id', verifyToken, authorizeRoles('user','dsa','admin'), getRequest);

// admin update status
router.put('/:id/status', verifyToken, authorizeRoles('admin'), adminUpdateStatus);

export default router;
