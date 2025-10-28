import Joi from 'joi';

export const userUpdateSchema = Joi.object({
  fullName: Joi.string().min(2).optional(),
  email: Joi.string().email().optional(),
  role: Joi.string().valid('user','dsa','admin').optional(),
  isActive: Joi.boolean().optional()
});

export const verifyKycSchema = Joi.object({
  status: Joi.string().valid('verified','rejected').required(),
  adminNotes: Joi.string().allow('', null).optional()
});

export const forwardSchema = Joi.object({
  recipients: Joi.array().items(Joi.object({ name: Joi.string().optional(), email: Joi.string().email().optional(), phone: Joi.string().optional() })).min(1).required(),
  method: Joi.string().valid('email','whatsapp','manual').required(),
  message: Joi.string().allow('', null).optional()
});

export const reconcileSchema = Joi.object({ razorpay_order_id: Joi.string().required() });

export const refundSchema = Joi.object({ amount: Joi.number().integer().min(1).required(), reason: Joi.string().allow('', null).optional() });
