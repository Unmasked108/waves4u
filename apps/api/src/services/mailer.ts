import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config.js';
import { CAPITAL_RANGES, NotificationOutbox, User } from '../models/index.js';
import { esc, invoiceData, invoiceHtml } from './invoice.js';

let transport: Transporter | undefined;
const smtpReady = () => !!env.SMTP_HOST;

function transporter() {
  if (transport) return transport;
  transport = smtpReady()
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      })
    : nodemailer.createTransport({ jsonTransport: true }); // dev: nothing is sent, the email is logged
  return transport;
}

const CAPITAL_LABEL: Record<(typeof CAPITAL_RANGES)[number], string> = {
  below_1l: 'Below ₹1,00,000',
  '1l_5l': '₹1,00,000 – ₹5,00,000',
  '5l_10l': '₹5,00,000 – ₹10,00,000',
  above_10l: 'Above ₹10,00,000',
};

const layout = (title: string, body: string) => `
<div style="background:#F5F7FA;padding:24px 12px;font-family:Inter,Arial,sans-serif;color:#1F2933">
  <div style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E4E7EB">
    <div style="background:#0F2A4A;padding:18px 24px;color:#fff;font-size:20px;font-weight:700">waves<span style="color:#C9A227">4u</span></div>
    <div style="padding:24px">
      <h1 style="font-size:20px;color:#0F2A4A;margin:0 0 12px">${esc(title)}</h1>
      ${body}
    </div>
    <div style="padding:16px 24px;background:#F5F7FA;font-size:11px;color:#52606D">
      Investments in securities market are subject to market risks. Read all the related documents carefully before investing.
      Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.
    </div>
  </div>
</div>`;
const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#0F2A4A;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${esc(label)}</a></p>`;
const p = (s: string) => `<p style="line-height:1.6;margin:0 0 12px">${s}</p>`;

type Mail = { subject: string; html: string };

/** Turns an outbox row into an email. Add a case here for every new template. */
async function render(template: string, data: any, name: string): Promise<Mail | null> {
  const site = env.CLIENT_URL;
  switch (template) {
    case 'welcome':
      return { subject: 'Welcome to waves4u', html: layout(`Welcome, ${name}`, p('Your free account is ready. You can read our blogs, free market analysis and videos right away.') + button(`${site}/plans`, 'See plans')) };
    case 'password_reset':
      return { subject: 'Reset your waves4u password', html: layout('Reset your password', p('We received a request to reset your password. This link is valid for 30 minutes.') + button(data.url, 'Choose a new password') + p('If you did not ask for this, you can ignore this email; your password stays the same.')) };
    case 'password_changed':
      return { subject: 'Your waves4u password was changed', html: layout('Password changed', p('Your password was just changed and you were signed out of other devices. If this was not you, reset your password immediately and contact us.')) };
    case 'payment_success': {
      const inv = await invoiceData(data.paymentId);
      if (!inv) return null;
      return {
        subject: `Payment received · Invoice ${inv.invoiceNo}`,
        html: layout('Thank you, your plan is active', p(`Your <b>${esc(inv.item.description)}</b> plan is active until <b>${new Date(data.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</b>.`) + invoiceHtml(inv) + button(`${site}/dashboard/billing`, 'Open your dashboard')),
      };
    }
    case 'expiry_reminder':
      return {
        subject: data.days === 1 ? 'Your waves4u plan expires tomorrow' : `Your waves4u plan expires in ${data.days} days`,
        html: layout('Time to renew', p(`Your <b>${esc(data.planName)}</b> plan ends on <b>${new Date(data.endsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</b>. Renew now to keep your access without a gap; renewing early adds the new period after your current one.`) + button(`${site}/checkout/${data.planCode}${data.segment ? `?segment=${data.segment}` : ''}`, 'Renew now')),
      };
    case 'subscription_cancelled':
      return { subject: 'Your waves4u plan was cancelled', html: layout('Plan cancelled', p(`Your <b>${esc(data.planName)}</b> plan has been cancelled. Contact us if you have any questions.`)) };
    case 'lead_new':
      return {
        subject: `New callback request: ${data.name}`,
        html: layout('New callback request', p(`<b>Name:</b> ${esc(data.name)}<br><b>Mobile:</b> <a href="tel:+91${esc(data.mobile)}">+91 ${esc(data.mobile)}</a><br><b>Trading capital:</b> ${esc(CAPITAL_LABEL[data.capital as keyof typeof CAPITAL_LABEL] ?? data.capital)}<br><b>Page:</b> ${esc(data.page ?? '/')}`) + button(`${site}/admin/leads`, 'Open leads')),
      };
    default:
      return null;
  }
}

/** Sends one outbox row. Failures are recorded and retried by the worker (max 5 attempts). */
export async function deliver(id: unknown) {
  const row = await NotificationOutbox.findOneAndUpdate(
    { _id: id, status: 'pending', attempts: { $lt: 5 } },
    { $inc: { attempts: 1 } },
    { new: true },
  );
  if (!row) return false;
  try {
    if (row.channel !== 'email') throw new Error(`Channel ${row.channel} is not configured`);
    const user = row.user ? await User.findById(row.user).select('name email').lean() : null;
    const to = row.to || user?.email;
    if (!to) throw new Error('No recipient');
    const mail = await render(row.template, row.payload ?? {}, user?.name ?? 'there');
    if (!mail) throw new Error(`Unknown template or missing data: ${row.template}`);
    await transporter().sendMail({ from: env.MAIL_FROM, to, subject: mail.subject, html: mail.html });
    if (!smtpReady()) console.log(`[mail:dev] to=${to} subject="${mail.subject}"${row.template === 'password_reset' ? ` url=${(row.payload as any)?.url}` : ''}`);
    await NotificationOutbox.updateOne({ _id: row._id }, { status: 'sent', sentAt: new Date(), lastError: null });
    return true;
  } catch (e: any) {
    await NotificationOutbox.updateOne(
      { _id: row._id },
      { lastError: String(e?.message ?? e), ...(row.attempts >= 5 ? { status: 'failed' } : {}) },
    );
    return false;
  }
}

/** Worker job: retries anything still pending. */
export async function deliverPending(limit = 50) {
  const rows = await NotificationOutbox.find({ status: 'pending', attempts: { $lt: 5 } }).sort({ createdAt: 1 }).limit(limit).select('_id').lean();
  let sent = 0;
  for (const r of rows) if (await deliver(r._id)) sent++;
  return sent;
}
