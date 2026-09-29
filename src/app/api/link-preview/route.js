import { lookup } from 'dns/promises';
import net from 'net';

export const runtime = 'nodejs';

// Link previews fetch arbitrary user-supplied URLs server-side, so guard
// against SSRF: only public http(s) hosts on standard ports, every redirect hop
// re-validated, and the response body capped.
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7));
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') ||
    v6.startsWith('fe8') || v6.startsWith('fe9') || v6.startsWith('fea') || v6.startsWith('feb') || v6.startsWith('ff');
}

async function assertPublicUrl(raw) {
  const u = new URL(raw);
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('invalid url');
  if (u.port && !['80', '443'].includes(u.port)) throw new Error('invalid url');
  if (u.username || u.password) throw new Error('invalid url');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  if (!addrs.length || addrs.some(a => isPrivateIp(a.address))) throw new Error('invalid url');
  return u;
}

async function safeFetch(raw) {
  let current = raw;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertPublicUrl(current);
    const res = await fetch(current, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FlockBot/1.0)', Accept: 'text/html' },
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    return res;
  }
  throw new Error('too many redirects');
}

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
