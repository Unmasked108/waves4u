import { XMLParser } from 'fast-xml-parser';
import { env } from '../config.js';
import { Video } from '../models/index.js';
import { youtubeThumb } from '../utils/video.js';

/** Reads the channel's public RSS feed (no API key) and upserts new videos as free videos.
 *  Admin edits (title, access, hidden) are kept: only new videos get those defaults. */
export async function syncYoutube() {
  if (!env.YOUTUBE_CHANNEL_ID) return 0;
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${env.YOUTUBE_CHANNEL_ID}`);
  if (!res.ok) throw new Error(`YouTube feed ${res.status}`);
  const feed = new XMLParser().parse(await res.text())?.feed;
  const entries: any[] = [].concat(feed?.entry ?? []);
  if (!entries.length) return 0;
  await Video.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { provider: 'youtube', videoId: e['yt:videoId'] },
        update: {
          $set: { thumbnail: youtubeThumb(e['yt:videoId']), publishedAt: new Date(e.published) },
          $setOnInsert: { provider: 'youtube', videoId: e['yt:videoId'], title: e.title, access: 'free', source: 'sync', hidden: false },
        },
        upsert: true,
      },
    })),
  );
  return entries.length;
}
