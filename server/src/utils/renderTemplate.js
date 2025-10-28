import Handlebars from 'handlebars';
import DOMPurify from 'isomorphic-dompurify';

// Simple cache for compiled templates
const cache = new Map();

export function compileTemplate(key, source) {
  const fn = Handlebars.compile(source);
  cache.set(key, fn);
  return fn;
}

export function renderCompiled(fn, context, options = { escapeHtml: true }) {
  const raw = fn(context);
  if (options.escapeHtml) return DOMPurify.sanitize(raw);
  return raw;
}

export function renderStringTemplate(key, source, context) {
  let fn = cache.get(key);
  if (!fn) fn = compileTemplate(key, source);
  return renderCompiled(fn, context);
}
