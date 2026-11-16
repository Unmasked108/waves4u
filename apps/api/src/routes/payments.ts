import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config.js';
import { Payment, PaymentEvent, Plan, SEGMENT_LABELS, SEGMENTS, User } from '../models/index.js';
import { authenticate } from '../middleware/auth.js';
import { invoiceData } from '../services/invoice.js';
import { razorpay } from '../services/razorpay.js';
import { fulfilPayment, quote } from '../services/subscription.js';
import { AppError, wrap } from '../utils/errors.js';
import { indianMobile } from '../utils/phone.js';
import { gstSplit, MONTHS, savingPercent } from '../utils/money.js';
import { verifyCheckout, verifyWebhook } from '../utils/signature.js';

const r = Router();

const PRODUCT_INFO = {
  trade: { name: 'Trade with us', tagline: 'Advisory · real-time research calls with defined levels' },
  club: { name: 'waves4u club', tagline: 'Membership community for ongoing market views and learning' },
} as const;

/** Plans grouped by product, with "saving vs monthly" worked out on the server. */
export const listPlans: RequestHandler = wrap(async (_req, res) => {
  const plans = await Plan.find({ active: true }).sort({ product: -1, sortOrder: 1, durationDays: 1 }).lean();
  const products = (['trade', 'club'] as const).map((product) => {
    const mine = plans.filter((p) => p.product === product);
    const monthly = mine.find((p) => p.duration === 'monthly')?.pricePaise;
    return {
      product,
      ...PRODUCT_INFO[product],
      segments: product === 'trade' ? SEGMENTS.map((s) => ({ code: s, label: SEGMENT_LABELS[s] })) : [],
      plans: mine.map((p) => ({
        code: p.code, name: p.name, product: p.product, duration: p.duration, pricePaise: p.pricePaise, durationDays: p.durationDays,
        months: MONTHS[p.duration], perMonthPaise: Math.round(p.pricePaise / MONTHS[p.duration]),
        savingPercent: savingPercent(p.pricePaise, MONTHS[p.duration], monthly),
      })),
    };
  }).filter((p) => p.plans.length);
  res.json({ products, plans: products.flatMap((p) => p.plans) });
});

/** Price check before paying (used by the checkout page to show coupon discounts). */
r.post('/quote', wrap(async (req, res) => {
  const b = z.object({ planCode: z.string(), coupon: z.string().max(40).optional() }).parse(req.body);
  const q = await quote(b.planCode, b.coupon || undefined);
  res.json({
    plan: { code: q.plan.code, name: q.plan.name, product: q.plan.product, duration: q.plan.duration, durationDays: q.plan.durationDays },
    listPricePaise: q.listPricePaise, discountPaise: q.discountPaise, amountPaise: q.amountPaise, coupon: q.coupon ?? null,
    ...gstSplit(q.amountPaise),
  });
}));

const billingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: indianMobile,
  state: z.string().trim().min(2, 'Choose your state').max(60),
  address: z.string().trim().max(300).optional(),
  gstin: z.string().trim().toUpperCase().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'GSTIN looks incorrect').optional().or(z.literal('')),
});

/** Step 1: create a Razorpay order. The price comes from OUR database, never from the browser. */
r.post('/order', authenticate, wrap(async (req, res) => {
  const b = z.object({
    planCode: z.string(),
    segment: z.enum(SEGMENTS).optional(),
    coupon: z.string().max(40).optional(),
    billing: billingSchema,
  }).parse(req.body);
  const q = await quote(b.planCode, b.coupon || undefined);
  if (q.plan.product === 'trade' && !b.segment) throw new AppError(400, 'Choose a segment');
  const user = await User.findById(req.user!.id).select('email phone').lean();

  let order: { id: string };
  try {
    order = await razorpay().orders.create({
      amount: q.amountPaise,
      currency: 'INR',
      receipt: `w4u_${Date.now()}`,
      notes: { userId: req.user!.id, planCode: q.plan.code, segment: b.segment ?? '', coupon: q.coupon ?? '' },
    });
  } catch (e) {
    console.error('Razorpay order failed', e); // usually wrong keys or a gateway outage
    throw new AppError(502, 'Online payment is temporarily unavailable. Please try again in a few minutes or request a callback.');
  }
  const pay = await Payment.create({
    user: req.user!.id, plan: q.plan._id, product: q.plan.product, segment: q.plan.product === 'trade' ? b.segment : undefined,
    razorpayOrderId: order.id, listPricePaise: q.listPricePaise, discountPaise: q.discountPaise, coupon: q.coupon,
    amountPaise: q.amountPaise, ...gstSplit(q.amountPaise),
    billing: { ...b.billing, email: user?.email },
  });
  if (!user?.phone) await User.updateOne({ _id: req.user!.id }, { phone: b.billing.phone });
  res.json({ orderId: order.id, paymentId: String(pay._id), amount: q.amountPaise, currency: 'INR', keyId: env.RAZORPAY_KEY_ID });
}));

/** Step 2 (fast path): browser reports success. We verify the signature, then fulfil. */
r.post('/verify', authenticate, wrap(async (req, res) => {
  const b = z.object({ razorpay_order_id: z.string(), razorpay_payment_id: z.string(), razorpay_signature: z.string() }).parse(req.body);
  if (!verifyCheckout(b.razorpay_order_id, b.razorpay_payment_id, b.razorpay_signature, env.RAZORPAY_KEY_SECRET))
    throw new AppError(400, 'Invalid payment signature');
  const pay = await Payment.findOne({ razorpayOrderId: b.razorpay_order_id }).select('user').lean();
  if (!pay || String(pay.user) !== req.user!.id) throw new AppError(404, 'Order not found');
  await fulfilPayment(b.razorpay_order_id, b.razorpay_payment_id);
  res.json({ ok: true, paymentId: String(pay._id) });
}));

/** Browser reports a failed / cancelled payment, so the failure page can show it. */
r.post('/failed', authenticate, wrap(async (req, res) => {
  const b = z.object({ orderId: z.string(), reason: z.string().max(300).optional() }).parse(req.body);
  await Payment.updateOne({ razorpayOrderId: b.orderId, user: req.user!.id, status: 'created' }, { status: 'failed', failedReason: b.reason });
  res.json({ ok: true });
}));

/**
 * Step 2 (source of truth): Razorpay calls this server-to-server. Mounted with express.raw() in app.ts
 * because the signature is computed over the exact raw bytes.
 */
export const webhook: RequestHandler = wrap(async (req, res) => {
  const sig = req.header('x-razorpay-signature') ?? '';
  const eventId = req.header('x-razorpay-event-id') ?? '';
  if (!eventId || !verifyWebhook(req.body as Buffer, sig, env.RAZORPAY_WEBHOOK_SECRET)) throw new AppError(400, 'Bad signature');

  const event = JSON.parse((req.body as Buffer).toString('utf8'));
  const stored = await PaymentEvent.findOneAndUpdate(
    { eventId }, { $setOnInsert: { eventId, type: event.event, payload: event } }, { upsert: true, new: true },
  );
  if (stored!.processed) return res.json({ ok: true, duplicate: true }); // retry of an event we already handled

  const p = event.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && p) await fulfilPayment(p.order_id, p.id);
  if (event.event === 'payment.failed' && p)
    await Payment.updateOne({ razorpayOrderId: p.order_id, status: 'created' }, { status: 'failed', failedReason: p.error_description });

  await PaymentEvent.updateOne({ eventId }, { processed: true });
  res.json({ ok: true });
});

/** The logged-in user's payment history / invoices. */
r.get('/mine', authenticate, wrap(async (req, res) => {
  res.json({
    payments: await Payment.find({ user: req.user!.id, status: 'paid' }).sort({ paidAt: -1 })
      .populate('plan', 'name').select('invoiceNo amountPaise taxablePaise gstPaise discountPaise coupon segment paidAt plan').lean(),
  });
}));

/** One payment's status (checkout success page polls this while the webhook catches up). */
r.get('/:id/status', authenticate, wrap(async (req, res) => {
  z.string().length(24).parse(req.params.id);
  const p = await Payment.findOne({ _id: req.params.id, user: req.user!.id }).populate('plan', 'name code').select('status plan segment amountPaise invoiceNo failedReason').lean();
  if (!p) throw new AppError(404, 'Payment not found');
  res.json({ payment: p });
}));

/** GST invoice for one of the user's own payments (admins can open any). */
r.get('/:id/invoice', authenticate, wrap(async (req, res) => {
  z.string().length(24).parse(req.params.id);
  const owner = await Payment.findById(req.params.id).select('user').lean();
  if (!owner || (String(owner.user) !== req.user!.id && req.user!.role !== 'admin')) throw new AppError(404, 'Invoice not found');
  const inv = await invoiceData(req.params.id);
  if (!inv) throw new AppError(404, 'Invoice not found');
  res.json({ invoice: inv });
}));

export default r;
