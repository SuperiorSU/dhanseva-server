import Service from '../models/Service.js';
import { createServiceSchema, updateServiceSchema } from '../validation/serviceValidation.js';

export async function createService(req, res, next) {
  try {
    const { error, value } = createServiceSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const svc = await Service.create(value);
    return res.status(201).json({ service: svc });
  } catch (err) {
    return next(err);
  }
}

export async function listServices(req, res, next) {
  try {
    const { category } = req.query;
    const where = {};
    if (category) where.category = category;
    const list = await Service.findAll({ where, order: [['created_at','DESC']] });
    return res.json({ items: list });
  } catch (err) {
    return next(err);
  }
}

export async function getService(req, res, next) {
  try {
    const { id } = req.params;
    const svc = await Service.findByPk(id);
    if (!svc) return res.status(404).json({ message: 'Not found' });
    return res.json({ service: svc });
  } catch (err) {
    return next(err);
  }
}

export async function updateService(req, res, next) {
  try {
    const { id } = req.params;
    const { error, value } = updateServiceSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
    const svc = await Service.findByPk(id);
    if (!svc) return res.status(404).json({ message: 'Not found' });
    await svc.update(value);
    return res.json({ service: svc });
  } catch (err) {
    return next(err);
  }
}

export async function deleteService(req, res, next) {
  try {
    const { id } = req.params;
    const svc = await Service.findByPk(id);
    if (!svc) return res.status(404).json({ message: 'Not found' });
    // soft delete
    await svc.update({ isActive: false });
    return res.json({ message: 'Service deactivated' });
  } catch (err) {
    return next(err);
  }
}
