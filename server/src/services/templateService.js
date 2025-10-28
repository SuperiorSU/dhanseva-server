import Template from '../models/Template.js';
import { renderStringTemplate } from '../utils/renderTemplate.js';

export async function getTemplate(key, locale = 'en_IN') {
  return Template.findOne({ where: { key, locale, isActive: true } });
}

export async function renderTemplate(key, locale = 'en_IN', payload = {}) {
  const tpl = await getTemplate(key, locale);
  if (!tpl) throw new Error('Template not found');
  const subject = renderStringTemplate(`${key}:subject:${locale}`, tpl.subjectTemplate || '', payload);
  const body = renderStringTemplate(`${key}:body:${locale}`, tpl.bodyTemplate || '', payload);
  return { subject, body };
}

export async function upsertTemplate({ key, locale = 'en_IN', subjectTemplate, bodyTemplate, isActive = true }) {
  const [tpl] = await Template.upsert({ key, locale, subjectTemplate, bodyTemplate, isActive });
  return tpl;
}

export async function listTemplates({ page = 1, limit = 50 } = {}) {
  const offset = (page - 1) * limit;
  return Template.findAndCountAll({ limit, offset, order: [['updated_at','DESC']] });
}

export async function deactivateTemplate(key, locale = 'en_IN') {
  const tpl = await Template.findOne({ where: { key, locale } });
  if (!tpl) throw new Error('Template not found');
  tpl.isActive = false; await tpl.save();
  return tpl;
}
