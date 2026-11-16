/** All money is stored as integer paise, never floats. Price is GST-inclusive. */
export function gstSplit(totalPaise: number, ratePercent = 18) {
  const taxable = Math.round((totalPaise * 100) / (100 + ratePercent));
  return { taxablePaise: taxable, gstPaise: totalPaise - taxable };
}
export const inr = (paise: number) =>
  '₹' + (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 });
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Saving of a longer plan versus paying the monthly price for the same number of months. */
export function savingPercent(pricePaise: number, months: number, monthlyPaise?: number) {
  if (!monthlyPaise || months <= 1) return 0;
  const full = monthlyPaise * months;
  return Math.max(0, Math.round(((full - pricePaise) / full) * 100));
}
export const MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };

/** Applies a coupon to a price. Never returns less than ₹1 (Razorpay minimum). */
export function applyCoupon(pricePaise: number, c: { type: 'percent' | 'flat'; value: number }) {
  const off = c.type === 'percent' ? Math.round((pricePaise * Math.min(100, c.value)) / 100) : c.value;
  const discount = Math.min(Math.max(0, off), pricePaise - 100);
  return { discountPaise: discount, amountPaise: pricePaise - discount };
}
