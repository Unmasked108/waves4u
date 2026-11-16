import argon2 from 'argon2';
import mongoose from 'mongoose';
import { env } from './config.js';
import { connectDb } from './db.js';
import { Market, Plan, User } from './models/index.js';

await connectDb();
const db = mongoose.connection.db!;

/* ---------- One-time migrations from the first version (safe to re-run) ---------- */
// 1. Old single "Premium" plans become inactive legacy plans so the new plan index can be built.
await db.collection('plans').updateMany(
  { product: { $exists: false } },
  [{ $set: { product: 'club', duration: { $concat: ['legacy-', '$code'] }, active: false } }],
);
// 2. Old subscriptions (from those plans) count as club membership.
await db.collection('subscriptions').updateMany({ product: { $exists: false } }, { $set: { product: 'club' } });
await db.collection('payments').updateMany({ product: { $exists: false } }, { $set: { product: 'club' } });
// 3. Videos: youtubeId -> provider + videoId.
await db.collection('videos').updateMany(
  { youtubeId: { $exists: true }, videoId: { $exists: false } },
  [{ $set: { provider: 'youtube', videoId: '$youtubeId', access: 'free', source: 'sync', hidden: false } }, { $unset: 'youtubeId' }],
);
await db.collection('videos').dropIndex('youtubeId_1').catch(() => {});
// 4. Blogs were premium-only before; the spec makes them free unless marked otherwise.
await db.collection('blogposts').updateMany({ access: { $exists: false } }, { $set: { access: 'free' } });
await db.collection('analyses').updateMany({ access: { $exists: false } }, { $set: { access: 'premium' } });
await Promise.all([Plan.syncIndexes(), mongoose.model('Video').syncIndexes()]);

/* ---------- Plans and prices from the specification (GST inclusive). Admins can edit them later. ---------- */
const PLANS = [
  ['trade', 'monthly', 'Trade with us · Monthly', 8_000, 30],
  ['trade', 'quarterly', 'Trade with us · Quarterly', 18_000, 90],
  ['trade', 'half_yearly', 'Trade with us · Half yearly', 36_000, 180],
  ['trade', 'yearly', 'Trade with us · Yearly', 72_000, 365],
  ['club', 'monthly', 'waves4u club · Monthly', 899, 30],
  ['club', 'quarterly', 'waves4u club · Quarterly', 2_100, 90],
  ['club', 'half_yearly', 'waves4u club · Half yearly', 4_200, 180],
  ['club', 'yearly', 'waves4u club · Yearly', 8_400, 365],
] as const;
await Plan.bulkWrite(
  PLANS.map(([product, duration, name, rupees, days], i) => ({
    updateOne: {
      filter: { product, duration },
      // $setOnInsert: never overwrites prices an admin has already changed
      update: { $setOnInsert: { code: `${product}-${duration.replace('_', '-')}`, product, duration, name, pricePaise: rupees * 100, durationDays: days, active: true, sortOrder: i } },
      upsert: true,
    },
  })),
);

const markets: [string, string, any][] = [
  ['Nifty 50', 'nifty-50', 'Index'], ['Bank Nifty', 'bank-nifty', 'Index'], ['Bank Nifty Futures', 'bank-nifty-futures', 'Derivatives'],
  ['Gold', 'gold', 'Commodity'], ['Silver', 'silver', 'Commodity'], ['Crude Oil', 'crude-oil', 'Commodity'], ['USD/INR', 'usd-inr', 'Forex'],
];
await Market.bulkWrite(markets.map(([name, slug, category]) => ({ updateOne: { filter: { slug }, update: { $setOnInsert: { name, slug, category } }, upsert: true } })));

if (!(await User.exists({ email: env.ADMIN_EMAIL }))) {
  await User.create({ name: 'Admin', email: env.ADMIN_EMAIL, passwordHash: await argon2.hash(env.ADMIN_PASSWORD), role: 'admin' });
  console.log(`Admin created: ${env.ADMIN_EMAIL}. Log in and set up two-factor authentication at /admin/security.`);
}
console.log('Seed complete');
process.exit(0);
