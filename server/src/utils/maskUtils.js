export function maskString(s) {
  if (!s) return s;
  if (s.includes('@')) {
    const [local, domain] = s.split('@');
    const l = local.length;
    const visible = Math.max(1, Math.floor(l / 3));
    return local.slice(0, visible) + '***' + '@' + domain;
  }
  if (s.length <= 4) return '****';
  return s.slice(0, 2) + '***' + s.slice(-2);
}
