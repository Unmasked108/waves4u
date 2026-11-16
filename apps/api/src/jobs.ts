import cron from 'node-cron';
import { BlogPost } from './models/index.js';
import { backupDatabase } from './services/backup.js';
import { deliverPending } from './services/mailer.js';
import { expireSubscriptions, sendExpiryReminders } from './services/subscription.js';
import { syncYoutube } from './services/youtube.js';

const safe = (name: string, fn: () => Promise<unknown>) => async () => {
  try { console.log(name, await fn()); } catch (e) { console.error(`${name} failed`, e); }
};
const tz = { timezone: 'Asia/Kolkata' };

/** Scheduled background jobs. Run by the separate worker process (production), or inside
 *  the API process when RUN_JOBS=true (free hosting with a single service, e.g. staging). */
export function startJobs() {
  cron.schedule('* * * * *', safe('deliver-emails', deliverPending));                // retries anything not yet sent
  cron.schedule('*/30 * * * *', safe('youtube-sync', syncYoutube));                 // new videos appear automatically
  cron.schedule('0 * * * *', safe('expire-subscriptions', async () => (await expireSubscriptions()).modifiedCount));
  cron.schedule('0 10 * * *', safe('expiry-reminders', sendExpiryReminders), tz);   // 7 days and 1 day before expiry
  cron.schedule('*/5 * * * *', safe('publish-scheduled-blog', async () => {
    const now = new Date();
    const r = await BlogPost.updateMany({ status: 'scheduled', publishAt: { $lte: now } }, { status: 'published', publishedAt: now });
    return r.modifiedCount;
  }));
  if (process.env.BACKUP_ENABLED !== 'false') cron.schedule('30 2 * * *', safe('daily-backup', backupDatabase), tz);

  safe('youtube-sync', syncYoutube)();
  safe('deliver-emails', deliverPending)();
  console.log('Background jobs started');
}
