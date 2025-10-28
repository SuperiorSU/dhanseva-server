import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const RZ_KEY_ID = process.env.RZ_KEY_ID;
const RZ_KEY_SECRET = process.env.RZ_KEY_SECRET;

const razorpay = new Razorpay({ key_id: RZ_KEY_ID, key_secret: RZ_KEY_SECRET });

export async function createOrder({ amount, currency = 'INR', receipt }) {
  // amount in paise for Razorpay
  const options = {
    amount: amount * 100,
    currency,
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1
  };
  const order = await razorpay.orders.create(options);
  return order;
}

export function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expected = crypto.createHmac('sha256', RZ_KEY_SECRET).update(body).digest('hex');
  return expected === razorpay_signature;
}
