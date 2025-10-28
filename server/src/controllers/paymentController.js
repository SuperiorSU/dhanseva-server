import { createOrderSchema, verifyPaymentSchema } from '../validation/paymentValidation.js';
import { createOrder, verifySignature } from '../services/razorpayService.js';
import Payment from '../models/Payment.js';
import Service from '../models/Service.js';

export async function createOrderHandler(req, res, next) {
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { amount, currency, serviceId } = value;
    const service = await Service.findByPk(serviceId);
    if (!service) return res.status(404).json({ message: 'Service not found' });
    if (service.basePrice !== amount) return res.status(400).json({ message: 'Amount mismatch with service basePrice' });

    const order = await createOrder({ amount, currency, receipt: `svc_${serviceId}_${Date.now()}` });

    // Save payment record with order id
    const payment = await Payment.create({ userId: req.user.id, orderId: order.id, amount, currency, status: 'pending', serviceId });

    return res.json({ order, paymentId: payment.id });
  } catch (err) {
    return next(err);
  }
}

export async function verifyPaymentHandler(req, res, next) {
  try {
    const { error, value } = verifyPaymentSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = value;
    const valid = verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature });

    // Find payment by orderId
    const payment = await Payment.findOne({ where: { orderId: razorpay_order_id } });
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });

    if (!valid) {
      payment.status = 'failed';
      payment.signature = razorpay_signature;
      await payment.save();
      return res.status(400).json({ message: 'Invalid signature' });
    }

    payment.status = 'success';
    payment.paymentId = razorpay_payment_id;
    payment.signature = razorpay_signature;
    await payment.save();

    return res.json({ message: 'Payment verified', payment });
  } catch (err) {
    return next(err);
  }
}

export async function listUserPayments(req, res, next) {
  try {
    const payments = await Payment.findAll({ where: { userId: req.user.id }, order: [['created_at','DESC']] });
    return res.json({ items: payments });
  } catch (err) {
    return next(err);
  }
}
