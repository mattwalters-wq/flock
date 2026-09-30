import { safeFetch } from '@/lib/public-fetch';

export const runtime = 'nodejs';
const MAX_BYTES = 512 * 1024;

async function readCapped(res) {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks.map(c => Buffer.from(c))).subarray(0, MAX_BYTES));
}

const CACHE = { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' };

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) return Response.json({ error: "missing url" }, { status: 400 });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return Response.json({ error: "invalid url" }, { status: 400 });
    }

    const domain = parsed.hostname.replace(/^www\./, "");

    // --- YouTube oEmbed ---
    const isYouTube = domain === "youtube.com" || domain === "youtu.be";
    if (isYouTube) {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return Response.json({
          url, title: data.title || null,
          description: `by ${data.author_name}`,
          image: data.thumbnail_url || null,
          siteName: "YouTube", domain: "youtube.com", type: "video",
        }, { headers: CACHE });
      }
    }

    // --- Spotify oEmbed ---
    const isSpotify = domain === "spotify.com" || domain === "open.spotify.com";
    if (isSpotify) {
      const oembedRes = await fetch(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return Response.json({
          url, title: data.title || null, description: null,
          image: data.thumbnail_url || null,
          siteName: "Spotify", domain: "spotify.com", type: "music",
        }, { headers: CACHE });
      }
    }

    // --- SoundCloud oEmbed ---
    if (domain === "soundcloud.com") {
      const oembedRes = await fetch(
        `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        return Response.json({
          url, title: data.title || null,
          description: `by ${data.author_name}`,
          image: data.thumbnail_url || null,
          siteName: "SoundCloud", domain: "soundcloud.com", type: "music",
        }, { headers: CACHE });
      }
    }

    // --- Generic OG scrape ---
    const res = await safeFetch(url);
    if (!res.ok) return Response.json({ error: "fetch failed" }, { status: 400 });
    if (!(res.headers.get("content-type") || "").includes("html")) {
      return Response.json({ url, title: null, description: null, image: null, siteName: domain, domain }, { headers: CACHE });
    }

    const html = await readCapped(res);
    const get = (pattern) => {
      const m = html.match(pattern);
      return m ? m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim() : null;
    };

    const title =
      get(/property="og:title"\s+content="([^"]+)"/i) ||
      get(/content="([^"]+)"\s+property="og:title"/i) ||
      get(/name="twitter:title"\s+content="([^"]+)"/i) ||
      get(/<title>([^<]+)<\/title>/i);
    const description =
      get(/property="og:description"\s+content="([^"]+)"/i) ||
      get(/content="([^"]+)"\s+property="og:description"/i) ||
      get(/name="description"\s+content="([^"]+)"/i);
    const image =
      get(/property="og:image"\s+content="([^"]+)"/i) ||
      get(/content="([^"]+)"\s+property="og:image"/i) ||
      get(/name="twitter:image"\s+content="([^"]+)"/i);
    const siteName = get(/property="og:site_name"\s+content="([^"]+)"/i) || domain;

    return Response.json({
      url,
      title: title?.slice(0, 100) || null,
      description: description?.slice(0, 200) || null,
      image: image && /^https?:\/\//i.test(image) ? image : null,
      siteName, domain,
    }, { headers: CACHE });
  } catch {
    return Response.json({ error: "preview unavailable" }, { status: 400 });
  }
}
