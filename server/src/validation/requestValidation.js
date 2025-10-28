import Joi from 'joi';

export const createRequestSchema = Joi.object({
  serviceId: Joi.string().guid({ version: 'uuidv4' }).required(),
  notes: Joi.string().allow('', null).optional(),
  documentUrls: Joi.array().items(Joi.string().uri()).optional(),
  paymentId: Joi.string().required()
});
