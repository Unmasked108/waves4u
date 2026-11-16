import mongoose from 'mongoose';
import { Coupon, Counter, Payment, Plan, Subscription, type Segment } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { applyCoupon } from '../utils/money.js';
import { notify } from './notifications.js';

const DAY = 864e5;

async function nextInvoiceNo(session: mongoose.ClientSession) {
  const c = await Counter.findByIdAndUpdate('invoice', { $inc: { seq: 1 } }, { upsert: true, new: true, session });
  return `W4U-${new Date().getFullYear()}-${String(c!.seq).padStart(5, '0')}`;
}

/** The same product (and, for Trade with us, the same segment) is what a renewal extends. */
const sameScope = (product: string, segment?: string | null) =>
  product === 'trade' ? { product, segment } : { product };

/** Looks up a coupon and checks it can be used for this plan. Throws a friendly error otherwise. */
export async function findUsableCoupon(code: string, plan: { product: string; duration: string }) {
  const c = await Coupon.findOne({ code: code.trim().toUpperCase(), active: true }).lean();
  const now = new Date();
  if (!c) throw new AppError(400, 'This coupon code is not valid');
  if (c.validFrom && c.validFrom > now) throw new AppError(400, 'This coupon is not active yet');
  if (c.validTo && c.validTo < now) throw new AppError(400, 'This coupon has expired');
  if (c.maxUses != null && c.usedCount >= c.maxUses) throw new AppError(400, 'This coupon has been fully used');
  if (c.products?.length && !c.products.includes(plan.product as any)) throw new AppError(400, 'This coupon does not apply to this plan');
  if (c.durations?.length && !c.durations.includes(plan.duration as any)) throw new AppError(400, 'This coupon does not apply to this duration');
  return c;
}

/** Final price for a plan, with an optional coupon. The browser never decides the price. */
export async function quote(planCode: string, couponCode?: string) {
  const plan = await Plan.findOne({ code: planCode, active: true }).lean();
  if (!plan) throw new AppError(404, 'Plan not found');
  let discountPaise = 0;
  let amountPaise = plan.pricePaise;
  let coupon: string | undefined;
  if (couponCode) {
    const c = await findUsableCoupon(couponCode, plan);
    ({ discountPaise, amountPaise } = applyCoupon(plan.pricePaise, c as any));
    coupon = c.code;
  }
  return { plan, listPricePaise: plan.pricePaise, discountPaise, amountPaise, coupon };
}

/**
 * Marks a payment as paid and activates / extends the subscription.
 * IDEMPOTENT: calling it twice (verify endpoint + webhook, or a webhook retry) does nothing extra.
 * Runs in a transaction, so a payment is never "paid" without a subscription (or the reverse).
 */
export async function fulfilPayment(orderId: string, paymentId: string) {
  const session = await mongoose.startSession();
  let result: { userId: unknown; paymentId: unknown; endsAt: Date } | null = null;
  try {
    await session.withTransaction(async () => {
      result = null;
      const pay = await Payment.findOne({ razorpayOrderId: orderId }).session(session);
      if (!pay) throw new AppError(404, 'Unknown order');
      if (pay.status === 'paid') return; // already done
      const plan = await Plan.findById(pay.plan).session(session);
      if (!plan) throw new AppError(500, 'Plan missing');

      const now = new Date();
      const scope = sameScope(plan.product, pay.segment);
      const current = await Subscription.findOne({ user: pay.user, status: 'active', endsAt: { $gt: now }, ...scope })
        .sort({ endsAt: -1 }).session(session);
      const startsAt = current ? current.endsAt : now; // renewing early extends, never wastes days
      const endsAt = new Date(startsAt.getTime() + plan.durationDays * DAY);
      const hadBefore = await Payment.exists({ user: pay.user, status: 'paid', product: plan.product }).session(session);

      await Subscription.create(
        [{ user: pay.user, plan: plan._id, product: plan.product, segment: plan.product === 'trade' ? pay.segment : undefined, startsAt, endsAt, status: 'active', source: 'payment', payment: pay._id }],
        { session },
      );
      if (pay.coupon) await Coupon.updateOne({ code: pay.coupon }, { $inc: { usedCount: 1 } }, { session });
      pay.status = 'paid';
      pay.razorpayPaymentId = paymentId;
      pay.paidAt = now;
      pay.isRenewal = !!hadBefore;
      pay.invoiceNo = await nextInvoiceNo(session);
      await pay.save({ session });
      result = { userId: pay.user, paymentId: pay._id, endsAt };
    });
  } finally {
    await session.endSession();
  }
  const r = result as { userId: unknown; paymentId: unknown; endsAt: Date } | null;
  if (r) await notify(r.userId, 'email', 'payment_success', { paymentId: String(r.paymentId), endsAt: r.endsAt }); // GST invoice email
}

/** Admin grants or extends access without payment (comp / support / offline payment). */
export async function grantSubscription(userId: string, planCode: string, days?: number, segment?: Segment) {
  const plan = await Plan.findOne({ code: planCode });
  if (!plan) throw new AppError(404, 'Plan not found');
  if (plan.product === 'trade' && !segment) throw new AppError(400, 'Choose a segment for Trade with us');
  const now = new Date();
  const current = await Subscription.findOne({ user: userId, status: 'active', endsAt: { $gt: now }, ...sameScope(plan.product, segment) }).sort({ endsAt: -1 });
  const startsAt = current ? current.endsAt : now;
  const endsAt = new Date(startsAt.getTime() + (days ?? plan.durationDays) * DAY);
  return Subscription.create({ user: userId, plan: plan._id, product: plan.product, segment: plan.product === 'trade' ? segment : undefined, startsAt, endsAt, status: 'active', source: 'admin' });
}

/** Extends one existing subscription by a number of days. */
export async function extendSubscription(subId: string, days: number) {
  const s = await Subscription.findById(subId);
  if (!s) throw new AppError(404, 'Subscription not found');
  const base = s.status === 'active' && s.endsAt > new Date() ? s.endsAt : new Date();
  s.endsAt = new Date(base.getTime() + days * DAY);
  s.status = 'active';
  s.remindersSent = [];
  await s.save();
  return s;
}

export async function cancelSubscription(subId: string) {
  const s = await Subscription.findById(subId).populate('plan', 'name');
  if (!s) throw new AppError(404, 'Subscription not found');
  if (s.status === 'cancelled') return s;
  s.status = 'cancelled';
  s.cancelledAt = new Date();
  await s.save();
  await notify(s.user, 'email', 'subscription_cancelled', { planName: (s.plan as any)?.name ?? 'waves4u' });
  return s;
}

export const expireSubscriptions = () =>
  Subscription.updateMany({ status: 'active', endsAt: { $lte: new Date() } }, { status: 'expired' });

/**
 * Sends renewal reminders 7 days and 1 day before expiry. Skips users who already renewed
 * (a later subscription for the same product/segment exists). Safe to run as often as you like.
 */
export async function sendExpiryReminders() {
  let sent = 0;
  for (const days of [7, 1]) {
    const now = Date.now();
    const subs = await Subscription.find({
      status: 'active',
      endsAt: { $gt: new Date(now), $lte: new Date(now + days * DAY) },
      remindersSent: { $ne: days },
    }).populate('plan', 'name code');
    for (const s of subs) {
      const renewed = await Subscription.exists({ user: s.user, status: 'active', endsAt: { $gt: s.endsAt }, ...sameScope(s.product, s.segment) });
      await Subscription.updateOne({ _id: s._id }, { $addToSet: { remindersSent: days } });
      // Within the last day only the 1-day reminder goes out.
      if (renewed || (days === 7 && s.endsAt.getTime() - now <= DAY)) continue;
      const plan = s.plan as any;
      const left = Math.max(1, Math.ceil((s.endsAt.getTime() - now) / DAY));
      await notify(s.user, 'email', 'expiry_reminder', { days: left, planName: plan?.name, planCode: plan?.code, segment: s.segment, endsAt: s.endsAt });
      sent++;
    }
  }
  return sent;
}
