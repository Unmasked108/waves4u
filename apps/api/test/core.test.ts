import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gstSplit, slugify } from '../src/utils/money.js';
import { hmac, verifyCheckout, verifyWebhook } from '../src/utils/signature.js';

test('checkout signature: valid passes, tampered fails', () => {
  const sig = hmac('order_1|pay_1', 'secret');
  assert.equal(verifyCheckout('order_1', 'pay_1', sig, 'secret'), true);
  assert.equal(verifyCheckout('order_1', 'pay_2', sig, 'secret'), false);
  assert.equal(verifyCheckout('order_1', 'pay_1', sig, 'wrong'), false);
});

test('webhook signature is computed over the raw body', () => {
  const body = Buffer.from('{"event":"payment.captured"}');
  assert.equal(verifyWebhook(body, hmac(body, 'whsec'), 'whsec'), true);
  assert.equal(verifyWebhook(Buffer.from('{"event":"x"}'), hmac(body, 'whsec'), 'whsec'), false);
});

test('GST split adds up exactly (18% inclusive)', () => {
  const { taxablePaise, gstPaise } = gstSplit(99900);
  assert.equal(taxablePaise + gstPaise, 99900);
  assert.equal(taxablePaise, 84661);
});

test('slugify', () => assert.equal(slugify('Gold: why the (3) extension?'), 'gold-why-the-3-extension'));

/* ---------- added with the spec build ---------- */
import { applyCoupon, savingPercent } from '../src/utils/money.js';
import { base32Decode, base32Encode, totpAt, verifyTotp } from '../src/utils/totp.js';
import { parseVideoUrl } from '../src/utils/video.js';
import { indianMobile } from '../src/utils/phone.js';

test('saving vs monthly matches the spec table', () => {
  assert.equal(savingPercent(1_800_000, 3, 800_000), 25); // Trade quarterly
  assert.equal(savingPercent(7_200_000, 12, 800_000), 25); // Trade yearly
  assert.equal(savingPercent(210_000, 3, 89_900), 22); // Club quarterly
  assert.equal(savingPercent(840_000, 12, 89_900), 22); // Club yearly
  assert.equal(savingPercent(89_900, 1, 89_900), 0);
});

test('coupons: percent, flat, and never below ₹1', () => {
  assert.deepEqual(applyCoupon(840_000, { type: 'percent', value: 20 }), { discountPaise: 168_000, amountPaise: 672_000 });
  assert.deepEqual(applyCoupon(89_900, { type: 'flat', value: 10_000 }), { discountPaise: 10_000, amountPaise: 79_900 });
  assert.equal(applyCoupon(89_900, { type: 'percent', value: 100 }).amountPaise, 100);
});

test('TOTP matches the RFC 6238 test vector', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(base32Decode(secret).toString(), '12345678901234567890');
  assert.equal(totpAt(secret, Math.floor(59 / 30)), '287082'); // RFC: 94287082, last 6 digits
  assert.equal(verifyTotp(secret, '287082', 59_000), true);
  assert.equal(verifyTotp(secret, '123456', 59_000), false);
});

test('video links: YouTube and Vimeo', () => {
  assert.deepEqual(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ'), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1'), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideoUrl('https://youtube.com/shorts/dQw4w9WgXcQ'), { provider: 'youtube', videoId: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideoUrl('https://vimeo.com/76979871'), { provider: 'vimeo', videoId: '76979871' });
  assert.equal(parseVideoUrl('https://example.com/video'), null);
});

test('Indian mobile numbers', () => {
  for (const ok of ['9876543210', '+91 98765 43210', '+91-9876543210', '09876543210', '919876543210'])
    assert.equal(indianMobile.parse(ok), '9876543210', ok);
  for (const bad of ['12345', '5876543210', '98765432101', 'abcdefghij']) assert.equal(indianMobile.safeParse(bad).success, false, bad);
});
