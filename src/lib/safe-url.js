// Returns the URL only if it is a plain http(s) link, otherwise null. Use it
// for every stored / user-supplied URL rendered into href or src: React does
// not block `javascript:` URLs, so an unchecked link is a stored-XSS vector.
export function safeUrl(u) {
  if (!u || typeof u !== 'string') return null;
  const s = u.trim();
  try {
    const x = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`);
    return ['http:', 'https:'].includes(x.protocol) ? x.href : null;
  } catch {
    return null;
  }
}
