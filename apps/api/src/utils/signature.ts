import crypto from 'node:crypto';

export const hmac = (data: string | Buffer, secret: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

export function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Razorpay Checkout: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret) */
export const verifyCheckout = (orderId: string, paymentId: string, signature: string, secret: string) =>
  safeEqual(hmac(`${orderId}|${paymentId}`, secret), signature);

/** Razorpay webhook: signature = HMAC_SHA256(raw request body, webhook_secret) */
export const verifyWebhook = (rawBody: Buffer, signature: string, secret: string) =>
  safeEqual(hmac(rawBody, secret), signature);
