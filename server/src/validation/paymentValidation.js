import Joi from 'joi';

export const createOrderSchema = Joi.object({
  amount: Joi.number().integer().min(1).required(),
  currency: Joi.string().valid('INR').default('INR'),
  serviceId: Joi.string().guid({ version: 'uuidv4' }).required()
});

export const verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});
