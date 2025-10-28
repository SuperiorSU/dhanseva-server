import Joi from 'joi';

export const previewSchema = Joi.object({ templateKey: Joi.string().required(), locale: Joi.string().optional(), payload: Joi.object().required() });

export const enqueueSchema = Joi.object({
  channel: Joi.string().valid('email','sms','whatsapp').required(),
  templateKey: Joi.string().required(),
  locale: Joi.string().default('en_IN'),
  recipient: Joi.object({ email: Joi.string().email().optional(), phone: Joi.string().optional(), name: Joi.string().optional() }).required(),
  payload: Joi.object().required(),
  idempotencyKey: Joi.string().optional(),
  createdBy: Joi.string().guid({ version: 'uuidv4' }).optional()
});
