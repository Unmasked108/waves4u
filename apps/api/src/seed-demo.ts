/**
 * Fills the site with SAMPLE content so you can see the design with real cards.
 *   npm run seed:demo      add sample analyses, blog posts, sessions, videos
 *   npm run unseed:demo    remove exactly those samples again
 * Requires `npm run seed` first (markets + admin).
 */
import { connectDb } from './db.js';
import { Analysis, BlogPost, Faq, Market, MentorSession, Testimonial, User, Video } from './models/index.js';

await connectDb();
const DAY = 864e5;

if (process.argv.includes('--clear')) {
  await Analysis.deleteMany({ title: /^DEMO/ });
  await BlogPost.deleteMany({ slug: /^demo-/ });
  await MentorSession.deleteMany({ title: /^\[Demo\]/ });
  await Video.deleteMany({ videoId: /^demo/ });
  await Faq.deleteMany({ question: /^\[Demo\]/ });
  await Testimonial.deleteMany({ city: /\(demo\)$/ });
  console.log('Demo content removed');
  process.exit(0);
}

const markets = await Market.find();
if (!markets.length) { console.log('Run `npm run seed` first.'); process.exit(1); }
const m = (slug: string) => markets.find((x) => x.slug === slug)!._id;
const admin = await User.findOne({ role: 'admin' });
const ago = (d: number) => new Date(Date.now() - d * DAY);

const analyses = [
  { slug: 'nifty-50', bias: 'Bullish', count: 'Wave 3 of (5) in progress', sum: 'Price is holding above the wave 1 high, so the third wave is intact.', lv: ['24,100', '25,000', '25,600', '23,850'] },
  { slug: 'bank-nifty-futures', bias: 'Bullish', count: 'Wave 4 correction nearing end', sum: 'A shallow correction into the 38% zone before the final push.', lv: ['51,800', '53,400', '55,000', '51,200'] },
  { slug: 'gold', bias: 'Bullish', count: 'Impulse (3) extension underway', sum: 'Sub-waves show momentum building rather than fading.', lv: ['2,350', '2,520', '2,650', '2,300'] },
  { slug: 'silver', bias: 'Bearish', count: 'A-B-C correction, wave C pending', sum: 'Wave B is a counter-trend bounce; wave C lower is expected.', lv: ['', '31', '27', '32.5'] },
  { slug: 'crude-oil', bias: 'Bearish', count: 'Wave B bounce, C lower expected', sum: 'Rallies are corrective, so the larger trend stays down.', lv: ['', '78', '70', '80'] },
  { slug: 'usd-inr', bias: 'Bullish', count: 'Wave 5 forming above wave 4 low', sum: 'The structure favours a final leg higher.', lv: ['83.2', '84.4', '85.0', '82.9'] },
] as const;
for (const [i, a] of analyses.entries()) {
  const title = `DEMO ${a.slug}`;
  if (await Analysis.exists({ title })) continue;
  await Analysis.create({
    market: m(a.slug), title, timeframe: 'Daily', waveCount: a.count, bias: a.bias, summary: a.sum,
    levels: { support: a.lv[0], resistance: a.lv[1], target: a.lv[2], stopLoss: a.lv[3], notes: 'Sample note: sizing and invalidation are explained in the weekly blog.' },
    status: 'published', publishedAt: ago(i), createdBy: admin?._id, access: i === 0 ? 'free' : 'premium',
  });
}

const posts = [
  ['demo-nifty-third-wave', 'Weekly outlook: Nifty’s third wave matures', 'Index', 'Nifty keeps respecting its rising channel, and the internal structure suggests the third wave is entering its late stage. Here is what we are watching into next week.', '<h2>Where we are in the count</h2><p>The third wave is the strongest and most extended wave in most impulses. Our count has it maturing, which means momentum should stay firm but entries need tighter risk.</p><h2>Levels we watch</h2><p>The invalidation level sits below the wave 1 high. A close under it would force a recount.</p><p><em>Sample post for design preview.</em></p>'],
  ['demo-gold-extension', 'Gold: why the (3) extension is not done yet', 'Commodity', 'Extended third waves are common in commodities. Gold’s sub-waves show momentum building rather than fading, which changes how we frame the next pullback.', '<h2>Sub-wave structure</h2><p>Inside the larger third wave we can label five smaller waves, and the fourth of those is still unfolding.</p><p><em>Sample post for design preview.</em></p>'],
  ['demo-derivatives-waves', 'Reading derivatives through wave counts', 'Derivatives', 'Futures and options react sharply near wave turning points. Understanding where you are in the wave helps you size and time positions better.', '<h2>Combine wave position with expiry</h2><p>Use the wave count for direction and open interest for timing, and never size up just because a count looks clean.</p><p><em>Sample post for design preview.</em></p>'],
] as const;
for (const [i, p] of posts.entries()) {
  if (await BlogPost.exists({ slug: p[0] })) continue;
  await BlogPost.create({ slug: p[0], title: p[1], market: p[2], teaser: p[3], body: p[4], status: 'published', publishedAt: ago(i * 7 + 1), author: admin?._id, access: i === 2 ? 'premium' : 'free' });
}

const sessions = [
  ['[Demo] Elliott Wave Basics Workshop', 'Counting impulses and corrections on real charts.', 5],
  ['[Demo] Trading Gold & Crude with Waves', 'Commodity setups and risk management.', 12],
  ['[Demo] Derivatives Risk Management', 'Position sizing around expiry.', 19],
] as const;
for (const [title, description, inDays] of sessions) {
  if (await MentorSession.exists({ title })) continue;
  await MentorSession.create({ title, description, startsAt: new Date(Date.now() + inDays * DAY), joinLink: 'https://meet.example.com/demo', capacity: 40 });
}

const videos = ['Nifty weekly wave count', 'Gold: is wave 3 extending?', 'Bank Nifty derivatives setup', 'Crude oil A-B-C explained', 'Elliott Wave basics', 'Silver outlook'];
for (const [i, title] of videos.entries()) {
  await Video.updateOne({ provider: 'youtube', videoId: `demo${i}` }, { $setOnInsert: { provider: 'youtube', videoId: `demo${i}`, title, thumbnail: '', access: i === 2 ? 'premium' : 'free', source: 'manual', publishedAt: ago(i * 4) } }, { upsert: true });
}

const faqs = [
  ['[Demo] Who is waves4u for?', 'Individual traders and investors, families and businesses in India and abroad who want disciplined, research-backed views on Indian markets.'],
  ['[Demo] Do you guarantee returns?', 'No. Investments in securities market are subject to market risks. We share research with defined risk; we never promise returns.'],
  ['[Demo] How do I pay?', 'Pay online with UPI, cards or net banking through our secure payment partner. A GST invoice is emailed to you automatically.'],
  ['[Demo] Can I subscribe to more than one segment?', 'Yes. Each segment of Trade with us is a separate subscription, so you can add the segments you trade.'],
] as const;
for (const [i, [question, answer]] of faqs.entries()) {
  await Faq.updateOne({ question }, { $setOnInsert: { question, answer, order: i, active: true } }, { upsert: true });
}

const testimonials = [
  ['Rahul', 'Ahmedabad (demo)', 'The clarity on levels and risk before every view has changed how I plan my trades.'],
  ['Priya', 'Mumbai (demo)', 'The Elliott Wave sessions finally made wave counting click for me. Very patient mentors.'],
  ['Amit', 'Surat (demo)', 'Disciplined, transparent and no hype. Exactly what I was looking for.'],
] as const;
for (const [i, [firstName, city, text]] of testimonials.entries()) {
  await Testimonial.updateOne({ firstName, city }, { $setOnInsert: { firstName, city, text, rating: 5, consent: true, order: i, active: true } }, { upsert: true });
}
console.log('Demo content added. Remove it later with: npm run unseed:demo');
process.exit(0);
