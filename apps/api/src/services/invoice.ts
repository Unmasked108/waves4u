import { env } from '../config.js';
import { Payment, SEGMENT_LABELS, type Segment } from '../models/index.js';
import { inr } from '../utils/money.js';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Everything printed on a GST invoice. Same data feeds the invoice page and the invoice email. */
export async function invoiceData(paymentId: unknown) {
  const p = await Payment.findById(paymentId).populate('plan', 'name product duration').populate('user', 'name email').lean();
  if (!p || p.status !== 'paid') return null;
  const plan = p.plan as any;
  const user = p.user as any;
  const intraState = !!p.billing?.state && p.billing.state.toLowerCase() === env.COMPANY_STATE.toLowerCase();
  const gst = p.gstPaise ?? 0;
  const half = Math.floor(gst / 2);
  return {
    id: String(p._id),
    invoiceNo: p.invoiceNo!,
    date: p.paidAt!,
    seller: { name: env.COMPANY_NAME, address: env.COMPANY_ADDRESS, state: env.COMPANY_STATE, gstin: env.COMPANY_GSTIN, sebi: env.SEBI_REG_NO },
    buyer: {
      name: p.billing?.name || user?.name,
      email: p.billing?.email || user?.email,
      phone: p.billing?.phone || '',
      address: p.billing?.address || '',
      state: p.billing?.state || '',
      gstin: p.billing?.gstin || '',
    },
    item: {
      description: `${plan?.name ?? 'Subscription'}${p.segment ? ` (${SEGMENT_LABELS[p.segment as Segment]})` : ''}`,
      sac: env.COMPANY_SAC,
    },
    listPricePaise: p.listPricePaise ?? p.amountPaise,
    discountPaise: p.discountPaise ?? 0,
    coupon: p.coupon ?? '',
    taxablePaise: p.taxablePaise ?? p.amountPaise,
    tax: intraState
      ? [{ label: 'CGST 9%', paise: half }, { label: 'SGST 9%', paise: gst - half }]
      : [{ label: 'IGST 18%', paise: gst }],
    totalPaise: p.amountPaise,
    paymentRef: p.razorpayPaymentId ?? '',
  };
}
export type Invoice = NonNullable<Awaited<ReturnType<typeof invoiceData>>>;

export function invoiceHtml(i: Invoice) {
  const row = (k: string, v: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:#52606D">${esc(k)}</td><td style="padding:6px 0;text-align:right;${bold ? 'font-weight:700;color:#0F2A4A' : ''}">${esc(v)}</td></tr>`;
  return `
<div style="font-family:Inter,Arial,sans-serif;color:#1F2933;max-width:640px">
  <h2 style="color:#0F2A4A;margin:0 0 4px">Tax Invoice</h2>
  <p style="margin:0 0 16px;color:#52606D">Invoice ${esc(i.invoiceNo)} · ${new Date(i.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <table width="100%" style="border-collapse:collapse;margin-bottom:16px"><tr>
    <td valign="top" style="width:50%;padding-right:12px"><b>${esc(i.seller.name)}</b><br>${esc(i.seller.address)}<br>State: ${esc(i.seller.state)}${i.seller.gstin ? `<br>GSTIN: ${esc(i.seller.gstin)}` : ''}${i.seller.sebi ? `<br>SEBI Reg. No: ${esc(i.seller.sebi)}` : ''}</td>
    <td valign="top" style="width:50%"><b>Billed to</b><br>${esc(i.buyer.name)}<br>${esc(i.buyer.email)}${i.buyer.address ? `<br>${esc(i.buyer.address)}` : ''}${i.buyer.state ? `<br>State: ${esc(i.buyer.state)}` : ''}${i.buyer.gstin ? `<br>GSTIN: ${esc(i.buyer.gstin)}` : ''}</td>
  </tr></table>
  <table width="100%" style="border-collapse:collapse;border-top:1px solid #E4E7EB">
    ${row(`${i.item.description} · SAC ${i.item.sac}`, inr(i.listPricePaise))}
    ${i.discountPaise ? row(`Discount${i.coupon ? ` (${i.coupon})` : ''}`, `− ${inr(i.discountPaise)}`) : ''}
    ${row('Taxable value', inr(i.taxablePaise))}
    ${i.tax.map((t) => row(t.label, inr(t.paise))).join('')}
    ${row('Total paid (GST inclusive)', inr(i.totalPaise), true)}
  </table>
  <p style="color:#52606D;font-size:12px;margin-top:16px">Payment reference: ${esc(i.paymentRef)}. This is a computer-generated invoice.</p>
</div>`;
}

export { esc };
