import Joi from 'joi';

export const createServiceSchema = Joi.object({
  title: Joi.string().min(3).required(),
  category: Joi.string().required(),
  description: Joi.string().allow('', null).optional(),
  basePrice: Joi.number().integer().min(0).required(),
  estimatedTime: Joi.string().allow('', null).optional(),
  requiredDocs: Joi.array().items(Joi.string()).optional()
});

export const updateServiceSchema = createServiceSchema.fork(['title','category','basePrice'], s => s.optional());
