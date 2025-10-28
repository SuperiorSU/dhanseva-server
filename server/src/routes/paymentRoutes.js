import express from 'express';
import { createOrderHandler, verifyPaymentHandler, listUserPayments } from '../controllers/paymentController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/order', verifyToken, authorizeRoles('user','dsa'), createOrderHandler);
router.post('/verify', verifyToken, authorizeRoles('user','dsa'), verifyPaymentHandler);
router.get('/user', verifyToken, authorizeRoles('user','dsa'), listUserPayments);

export default router;
