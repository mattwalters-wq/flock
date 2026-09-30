import { lookup } from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { Readable } from 'node:stream';

const globalV6 = new net.BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
const reservedV6 = new net.BlockList();
reservedV6.addSubnet('2001::', 32, 'ipv6');
reservedV6.addSubnet('2001:db8::', 32, 'ipv6');
reservedV6.addSubnet('2002::', 16, 'ipv6');

export function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113);
  }
  // Reject non-global IPv6, including all mapped/translated IPv4 spellings.
  return !net.isIPv6(ip) || !globalV6.check(ip, 'ipv6') || reservedV6.check(ip, 'ipv6');
}

export async function assertPublicUrl(raw, resolve = lookup) {
  const url = new URL(raw);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port))) throw new Error('invalid url');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await resolve(host, { all: true });
  if (!addresses.length || addresses.some(a => isPrivateIp(a.address))) throw new Error('invalid url');
  return { url, address: addresses[0] };
}

// Pin the validated address at connection time. A second DNS lookup in fetch()
// could otherwise resolve an attacker-controlled hostname to an internal IP.
export function fetchPinned(url, address) {
  return new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const signal = AbortSignal.timeout(5000);
    const request = transport.request(url, {
      signal,
      headers: { 'User-Agent': 'FlockBot/1.0', Accept: 'text/html' },
      lookup: (_host, options, callback) => {
        if (options.all) callback(null, [address]);
        else callback(null, address.address, address.family);
      },
    }, incoming => {
      const headers = new Headers();
      for (const [key, value] of Object.entries(incoming.headers)) {
        if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
      }
      const status = incoming.statusCode || 502;
      if ([204, 205, 304].includes(status)) {
        incoming.resume();
        resolve(new Response(null, { status, headers }));
      } else resolve(new Response(Readable.toWeb(incoming), { status, headers }));
    });
    request.on('error', reject);
    request.end();
  });
}

export async function safeFetch(raw) {
  let current = raw;
  for (let i = 0; i <= 3; i++) {
    const { url, address } = await assertPublicUrl(current);
    const response = await fetchPinned(url, address);
    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      await response.body?.cancel();
      current = new URL(response.headers.get('location'), current).href;
      continue;
    }
    return response;
  }
  throw new Error('too many redirects');
}
