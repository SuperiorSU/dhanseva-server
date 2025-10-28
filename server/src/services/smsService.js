import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
let client = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export async function sendSMS({ to, body }) {
  if (!client) return { ok: false, reason: 'twilio_not_configured' };
  try {
    const resp = await client.messages.create({ body, from: TWILIO_FROM, to });
    return { ok: true, resp };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
