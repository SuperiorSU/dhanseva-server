import Razorpay from 'razorpay';
import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../.env', import.meta.url).pathname });

const RZ_KEY_ID = process.env.RZ_KEY_ID;
const RZ_KEY_SECRET = process.env.RZ_KEY_SECRET;
const razorpay = new Razorpay({ key_id: RZ_KEY_ID, key_secret: RZ_KEY_SECRET });

export async function fetchPayment(razorpay_order_id) {
  // fetch payments for order
  const payments = await razorpay.orders.fetchPayments(razorpay_order_id);
  return payments;
}

export async function createRefund({ paymentId, amount, notes = {} }) {
  // amount in paise
  const refund = await razorpay.payments.refund(paymentId, { amount: amount * 100, notes });
  return refund;
}
