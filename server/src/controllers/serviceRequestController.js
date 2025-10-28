import ServiceRequest from '../models/ServiceRequest.js';
import Service from '../models/Service.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { createRequestSchema } from '../validation/requestValidation.js';
import { sendMail } from '../services/mailer.js';

export async function createRequest(req, res, next) {
  try {
    const { error, value } = createRequestSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { serviceId, notes, documentUrls, paymentId } = value;

    // check service
    const service = await Service.findByPk(serviceId);
    if (!service || !service.isActive) return res.status(404).json({ message: 'Service not available' });

    // check user KYC
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(403).json({ message: 'User not allowed' });
    if (user.kycStatus !== 'verified') return res.status(403).json({ message: 'User must be KYC verified to request this service' });

    // check payment
    const payment = await Payment.findOne({ where: { paymentId }, order: [['created_at','DESC']] });
    if (!payment || payment.status !== 'success' || payment.userId !== req.user.id) return res.status(400).json({ message: 'Invalid or unverified payment' });

    // ensure amount matches
    if (payment.amount !== service.basePrice) return res.status(400).json({ message: 'Payment amount mismatch' });

    // ensure no other active request for same service
    const active = await ServiceRequest.findOne({ where: { userId: req.user.id, serviceId, status: ['pending_review','in_progress'] } });
    if (active) return res.status(400).json({ message: 'You already have an active request for this service' });

    const reqRec = await ServiceRequest.create({ userId: req.user.id, serviceId, paymentId: payment.id, notes, documentUrls });

    // send acknowledgment email (best-effort)
    try {
      await sendMail({ to: user.email, subject: 'Service Request Received', text: `Your request for ${service.title} has been received. Request ID: ${reqRec.id}` });
    } catch (e) {
      // ignore email errors
    }

    return res.status(201).json({ request: reqRec });
  } catch (err) {
    return next(err);
  }
}

export async function listRequests(req, res, next) {
  try {
    const q = req.query;
    if (req.user.role === 'admin') {
      const where = {};
      if (q.status) where.status = q.status;
      if (q.serviceId) where.serviceId = q.serviceId;
      const items = await ServiceRequest.findAll({ where, order: [['created_at','DESC']] });
      return res.json({ items });
    }
    // user or dsa: show own requests (DSA logic to filter referred users would be specific; here we show own)
    const items = await ServiceRequest.findAll({ where: { userId: req.user.id }, order: [['created_at','DESC']] });
    return res.json({ items });
  } catch (err) {
    return next(err);
  }
}

export async function getRequest(req, res, next) {
  try {
    const { id } = req.params;
    const reqRec = await ServiceRequest.findByPk(id, { include: ['service','user'] });
    if (!reqRec) return res.status(404).json({ message: 'Not found' });

    // access control
    if (req.user.role !== 'admin' && reqRec.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    return res.json({ request: reqRec });
  } catch (err) {
    return next(err);
  }
}

export async function adminUpdateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    if (!['pending_review','in_progress','completed','rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const reqRec = await ServiceRequest.findByPk(id);
    if (!reqRec) return res.status(404).json({ message: 'Not found' });
    reqRec.status = status;
    if (adminNotes) reqRec.adminNotes = adminNotes;
    await reqRec.save();

    // Notify user
    const user = await User.findByPk(reqRec.userId);
    try {
      await sendMail({ to: user.email, subject: `Service Request Status Updated`, text: `Your request ${reqRec.id} is now ${status}` });
    } catch (e) {}

    return res.json({ request: reqRec });
  } catch (err) {
    return next(err);
  }
}
