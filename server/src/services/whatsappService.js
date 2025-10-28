// Minimal WhatsApp service helper - for MVP it returns a prefilled message and optionally attempts to send
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const WHATSAPP_ENABLED = !!process.env.WHATSAPP_API_TOKEN;

export async function sendWhatsApp({ toPhone, message }) {
  if (!WHATSAPP_ENABLED) {
    // Not configured - return payload for manual sending
    return { ok: false, reason: 'not_configured', payload: { toPhone, message } };
  }
  // Integration with WhatsApp Cloud API would go here (omitted for MVP)
  // Return simulated success for now
  return { ok: true, platformId: 'whatsapp-simulated-id' };
}

export function prefillWhatsAppMessage({ recipients, message, attachments }) {
  // recipients: [{name, phone}]
  const lines = [];
  if (message) lines.push(message);
  if (attachments && attachments.length) {
    lines.push('\nAttachments:');
    attachments.forEach(a => lines.push(a));
  }
  return { text: lines.join('\n'), recipients };
}
