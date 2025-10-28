import express from 'express';
import { createService, updateService, deleteService } from '../controllers/serviceController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', verifyToken, authorizeRoles('admin'), createService);
router.put('/:id', verifyToken, authorizeRoles('admin'), updateService);
router.delete('/:id', verifyToken, authorizeRoles('admin'), deleteService);

export default router;
