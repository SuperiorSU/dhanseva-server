import express from 'express';
import { requestPanVerification, getVerificationStatus, generateUploadUrl } from '../controllers/verificationController.js';
import { verifyToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// user or dsa can submit
router.post('/pan', verifyToken, authorizeRoles('user','dsa'), requestPanVerification);
router.get('/status', verifyToken, authorizeRoles('user','dsa'), getVerificationStatus);

// presigned upload URL
router.post('/upload-url', verifyToken, authorizeRoles('user','dsa'), generateUploadUrl);

export default router;
