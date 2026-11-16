'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Lock, Play } from 'lucide-react';
import type { Video } from '@/lib/types';
import { fmtDate } from '@/lib/types';
import { track } from '@/lib/analytics';
import { AccessPill } from './Cards';

const embedUrl = (v: Video) =>
  v.provider === 'vimeo'
    ? `https://player.vimeo.com/video/${v.videoId}?autoplay=1&dnt=1`
    : `https://www.youtube-nocookie.com/embed/${v.videoId}?autoplay=1&rel=0&modestbranding=1`;

/**
 * Embedded YouTube/Vimeo player. Only a thumbnail loads at first; the heavy player iframe loads when
 * the visitor presses play (keeps Lighthouse/LCP fast). Premium videos arrive without an id for
 * visitors who cannot watch them, so they show a lock instead.
 */
export default function VideoPlayer({ v, compact }: { v: Video; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <article className="card vid">
      <div className="player">
        {playing && v.videoId ? (
          <iframe src={embedUrl(v)} title={v.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {v.thumbnail && <img src={v.thumbnail} alt="" loading="lazy" decoding="async" />}
            {v.locked ? (
              <div className="locked">
                <Lock aria-hidden="true" />
                <b>{v.access === 'club' ? 'For waves4u club members' : 'For members'}</b>
                <Link href="/plans" className="btn btn-gold btn-sm">See plans</Link>
              </div>
            ) : v.videoId ? (
              <button className="play" onClick={() => { setPlaying(true); track('video_play', { video_title: v.title, provider: v.provider }); }} aria-label={`Play video: ${v.title}`}>
                <span><Play aria-hidden="true" /></span>
              </button>
            ) : null}
          </>
        )}
      </div>
      <h3>{v.title}</h3>
      <div className="meta" style={{ margin: 0 }}>
        <AccessPill access={v.access} />
        <time dateTime={v.publishedAt}>{fmtDate(v.publishedAt)}</time>
      </div>
      {!compact && v.description && <p className="small" style={{ marginTop: 8 }}>{v.description}</p>}
    </article>
  );
}
