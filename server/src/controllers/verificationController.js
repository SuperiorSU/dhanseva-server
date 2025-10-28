import { panVerifySchema, adminUpdateSchema } from '../validation/verificationValidation.js';
import { verifyPAN } from '../services/cashfreePanService.js';
import { generatePresignedUploadUrl } from '../services/s3Service.js';
import Verification from '../models/Verification.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import sequelize from '../db.js';

function maskPan(pan) {
  if (!pan || pan.length < 10) return pan;
  return pan.slice(0, 3) + '*****' + pan.slice(-2);
}

export async function requestPanVerification(req, res, next) {
  try {
    const { error, value } = panVerifySchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const userId = req.user.id;
    const { pan, name } = value;

    // Create initial verification record with status pending
    const tx = await sequelize.transaction();
    try {
      const verification = await Verification.create({
        userId,
        pan,
        nameProvided: name,
        status: 'pending'
      }, { transaction: tx });

      // Call cashfree
      let cfResp;
      try {
        cfResp = await verifyPAN({ pan, name });
      } catch (err) {
        // Store raw response with error info
        verification.rawResponse = { error: err.message };
        verification.status = 'pending_review';
        await verification.save({ transaction: tx });
        await tx.commit();
        return res.status(202).json({ message: 'Verification submitted for review', verificationId: verification.id });
      }

      // Map relevant fields from cashfree response
      verification.registeredName = cfResp.registered_name || null;
      verification.nameMatchScore = cfResp.name_match_score != null ? Number(cfResp.name_match_score) : null;
      verification.panStatus = cfResp.pan_status || null;
      verification.referenceId = cfResp.reference_id || null;
      verification.rawResponse = cfResp;

      // Business rules
      const valid = cfResp.valid === true || cfResp.valid === 'true';
      const score = Number(verification.nameMatchScore || 0);

      if (valid && score >= 90) {
        verification.status = 'verified';
        await verification.save({ transaction: tx });
        // update user kyc_status
        await User.update({ kycStatus: 'verified' }, { where: { id: userId }, transaction: tx });
        await tx.commit();
        return res.json({ message: 'PAN verified', status: 'verified', registeredName: verification.registeredName });
      }

      // else pending_review
      verification.status = 'pending_review';
      await verification.save({ transaction: tx });
      await User.update({ kycStatus: 'pending_review' }, { where: { id: userId }, transaction: tx });
      await tx.commit();
      return res.status(202).json({ message: 'Verification pending review', status: 'pending_review' });
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  } catch (err) {
    return next(err);
  }
}

export async function getVerificationStatus(req, res, next) {
  try {
    const userId = req.user.id;
    const latest = await Verification.findOne({ where: { userId }, order: [['created_at', 'DESC']] });
    if (!latest) return res.json({ status: 'unverified' });
    // Mask PAN before returning
    const response = latest.toJSON();
    response.pan = maskPan(response.pan);
    return res.json({ verification: response });
  } catch (err) {
    return next(err);
  }
}

export async function generateUploadUrl(req, res, next) {
  try {
    const { key, contentType } = req.body;
    if (!key) return res.status(400).json({ message: 'key is required' });
    // Basic validation: size and type checks should be enforced on client and via S3 bucket policies
    const url = await generatePresignedUploadUrl({ key, contentType, expiresSeconds: 900 });
    return res.json({ url, key });
  } catch (err) {
    return next(err);
  }
}

// Admin endpoints
export async function adminListVerifications(req, res, next) {
  try {
    const { status, userId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;
    const list = await Verification.findAll({ where, order: [['created_at', 'DESC']] });
    return res.json({ items: list });
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateVerification(req, res, next) {
  try {
    const { id } = req.params;
    const { error, value } = adminUpdateSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const verification = await Verification.findByPk(id);
    if (!verification) return res.status(404).json({ message: 'Not found' });

    const oldStatus = verification.status;
    verification.status = value.status;
    verification.adminNotes = value.adminNotes || null;
    await verification.save();

    // If verified, update user kyc_status
    if (value.status === 'verified') {
      await User.update({ kycStatus: 'verified' }, { where: { id: verification.userId } });
    } else if (value.status === 'rejected') {
      await User.update({ kycStatus: 'rejected' }, { where: { id: verification.userId } });
    }

    // Audit log
    await AuditLog.create({
      userId: req.user.id,
      action: 'admin_override_verification',
      details: { verificationId: id, from: oldStatus, to: value.status, notes: value.adminNotes },
      ipAddress: req.ip
    });

    return res.json({ message: 'Updated', verification });
  } catch (err) {
    return next(err);
  }
}
