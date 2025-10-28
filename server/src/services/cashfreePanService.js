import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const CF_CLIENT_ID = process.env.CF_CLIENT_ID;
const CF_CLIENT_SECRET = process.env.CF_CLIENT_SECRET;
const CF_BASE = process.env.CF_BASE_URL || 'https://api.cashfree.com/verification';

if (!CF_CLIENT_ID || !CF_CLIENT_SECRET) {
  // In prod we would throw or log, but leave as-is for dev
}

export async function verifyPAN({ pan, name }) {
  const url = `${CF_BASE}/pan`;
  const headers = {
    'Content-Type': 'application/json',
    'x-client-id': CF_CLIENT_ID,
    'x-client-secret': CF_CLIENT_SECRET
  };

  try {
    const resp = await axios.post(url, { pan, name }, { headers, timeout: 10000 });
    return resp.data;
  } catch (err) {
    // Normalize error
    const message = err.response?.data || err.message;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
}
