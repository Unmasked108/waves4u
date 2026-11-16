import { NotificationOutbox } from '../models/index.js';
import { deliver } from './mailer.js';

/**
 * The single place the app sends messages from. A row is written to the outbox first (so nothing is lost
 * if the email provider is down), then delivery is attempted straight away. The worker retries failures.
 */
export async function notify(
  userId: unknown,
  channel: 'email' | 'sms' | 'whatsapp' | 'push',
  template: string,
  payload: Record<string, unknown> = {},
  to?: string,
) {
  const row = await NotificationOutbox.create({ user: userId ?? undefined, to, channel, template, payload });
  deliver(row._id).catch((e) => console.error('mail delivery failed', e));
}
