import Joi from 'joi';

export const panVerifySchema = Joi.object({
  pan: Joi.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/).required(),
  name: Joi.string().min(3).required()
});

export const adminUpdateSchema = Joi.object({
  status: Joi.string().valid('verified','rejected','pending_review').required(),
  adminNotes: Joi.string().allow('', null).optional()
});
