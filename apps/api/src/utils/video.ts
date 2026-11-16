/** Reads a YouTube or Vimeo link and returns the provider and video id. */
export function parseVideoUrl(input: string): { provider: 'youtube' | 'vimeo'; videoId: string } | null {
  let u: URL;
  try {
    u = new URL(input.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0];
    return /^[\w-]{11}$/.test(id) ? { provider: 'youtube', videoId: id } : null;
  }
  if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return { provider: 'youtube', videoId: v };
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/);
    return m ? { provider: 'youtube', videoId: m[1] } : null;
  }
  if (host.endsWith('vimeo.com')) {
    const m = u.pathname.match(/\/(?:video\/)?(\d{6,12})(?:\/|$)/);
    return m ? { provider: 'vimeo', videoId: m[1] } : null;
  }
  return null;
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** Title + thumbnail from the provider's public oEmbed endpoint (no API key). Never throws. */
export async function videoMeta(provider: 'youtube' | 'vimeo', videoId: string) {
  const page = provider === 'youtube' ? `https://www.youtube.com/watch?v=${videoId}` : `https://vimeo.com/${videoId}`;
  const endpoint = provider === 'youtube' ? 'https://www.youtube.com/oembed' : 'https://vimeo.com/api/oembed.json';
  try {
    const r = await fetch(`${endpoint}?url=${encodeURIComponent(page)}&format=json`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error(String(r.status));
    const d = (await r.json()) as { title?: string; thumbnail_url?: string };
    return { title: d.title, thumbnail: provider === 'youtube' ? youtubeThumb(videoId) : d.thumbnail_url };
  } catch {
    return { title: undefined, thumbnail: provider === 'youtube' ? youtubeThumb(videoId) : undefined };
  }
}
