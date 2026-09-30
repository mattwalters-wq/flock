import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

async function moduleFrom(path) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}
const { safeUrl } = await moduleFrom('src/lib/safe-url.js');
const { escapeHtml, fromHeader } = await moduleFrom('src/lib/email.js');
const { isGod, SUPER_ADMIN_ID, GOD_EMAIL } = await moduleFrom('src/lib/god.js');
const { verifyStripeSignature } = await moduleFrom('src/lib/stripe.js');
const { isPrivateIp, assertPublicUrl } = await moduleFrom('src/lib/public-fetch.js');
const { isTrustedPushEndpoint } = await moduleFrom('src/lib/push-endpoint.js');

test('stored URLs reject active protocols', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd']) assert.equal(safeUrl(url), null);
  assert.equal(safeUrl('example.com/path'), 'https://example.com/path');
});
test('map/email HTML escapes attacker controlled markup and headers', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  assert.ok(!/[\r\n]/.test(fromHeader('artist\r\nBcc: stolen@example.com')));
});
test('an editable owner email never grants platform administration', () => {
  assert.equal(isGod({ id: 'another-account', email: GOD_EMAIL }), false);
  assert.equal(isGod({ id: SUPER_ADMIN_ID }), true);
});
test('webhook signatures require finite fresh timestamps and accept rotated secrets', () => {
  const body = '{"type":"test"}'; const secret = 'test-secret';
  const now = Math.floor(Date.now()/1000);
  const signature = t => crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${now},v1=${signature(now)}`, secret), true);
  assert.equal(verifyStripeSignature(body, `t=${now},v1=invalid,v1=${signature(now)}`, secret), true);
  assert.equal(verifyStripeSignature(body, `t=NaN,v1=${signature('NaN')}`, secret), false);
  assert.equal(verifyStripeSignature(body, `t=${now-600},v1=${signature(now-600)}`, secret), false);
  assert.equal(verifyStripeSignature(body+'x', `t=${now},v1=${signature(now)}`, secret), false);
});
test('SSRF rejects IPv4, mapped IPv6, transition and internal addresses', async () => {
  for (const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','172.16.0.1','192.168.1.1','100.64.0.1','::1','::ffff:127.0.0.1','::ffff:7f00:1','fc00::1','fe80::1','2002:7f00:1::']) assert.equal(isPrivateIp(ip), true, ip);
  assert.equal(isPrivateIp('8.8.8.8'), false);
  assert.equal(isPrivateIp('2606:4700:4700::1111'), false);
  await assert.rejects(assertPublicUrl('http://example.com', async () => [{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]));
  await assert.rejects(assertPublicUrl('http://127.1'));
  await assert.rejects(assertPublicUrl('http://example.com:8080'));
  const allowed = await assertPublicUrl('https://example.com', async () => [{address:'8.8.8.8',family:4}]);
  assert.equal(allowed.address.address,'8.8.8.8');
});
test('push subscriptions cannot make arbitrary server requests', () => {
  assert.equal(isTrustedPushEndpoint('https://fcm.googleapis.com/fcm/send/test'), true);
  for (const url of ['http://127.0.0.1','https://169.254.169.254','https://fcm.googleapis.com.attacker.test','https://attacker.test','https://web.push.apple.com:8080']) assert.equal(isTrustedPushEndpoint(url), false);
});

// Exercise actual route/middleware source with external dependencies stubbed.
async function loadHandler(path, names, dependencies) {
  let source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  source = source.replace(/^import .*;\n/gm, '').replace(/export (async function|function|const)/g, '$1');
  return new Function(...Object.keys(dependencies), `${source}\nreturn { ${names.join(', ')} };`)(...Object.values(dependencies));
}
const NextResponse = { json: (body, options) => Response.json(body, options), next: options => options, redirect: url => ({ redirect: String(url) }) };
test('middleware overwrites forged tenant headers and forwards resolved tenant to pages', async () => {
  const { middleware } = await loadHandler('middleware.js', ['middleware'], { NextResponse });
  const result = middleware(new Request('https://the-stamps.fans-flock.com/dashboard', {headers:{host:'the-stamps.fans-flock.com','x-tenant-slug':'attacker','x-host':'evil.test'}}));
  assert.equal(result.request.headers.get('x-tenant-slug'), 'the-stamps');
  const apex = middleware(new Request('https://www.fans-flock.com/login',{headers:{host:'www.fans-flock.com','x-tenant-slug':'attacker'}}));
  assert.equal(apex.request.headers.get('x-tenant-slug'), null);
});
test('failed verified billing writes return 500 so Stripe retries', async () => {
  const db = {from:()=>({update:()=>({eq:async()=>({error:{message:'database unavailable'}})})})};
  const { POST } = await loadHandler('src/app/api/billing/webhook/route.js',['POST'],{NextResponse,getServiceSupabase:()=>db,verifyStripeSignature:()=>true});
  process.env.STRIPE_WEBHOOK_SECRET = 'test';
  const response = await POST(new Request('https://example.test/api/billing/webhook',{method:'POST',body:JSON.stringify({type:'checkout.session.completed',data:{object:{metadata:{tenant_id:1},subscription:'sub_test'}}})}));
  assert.equal(response.status,500);
  delete process.env.STRIPE_WEBHOOK_SECRET;
});
test('tenant admin authorization rejects missing identity and cross-tenant fan roles', async () => {
  const db = {auth:{getUser:async()=>({data:{user:{id:'fan'}}})},from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'fan'}})})})})})};
  const { requireTenantAdmin } = await loadHandler('src/lib/api-auth.js',['requireTenantAdmin'],{NextResponse,getServiceSupabase:()=>db,isGod});
  assert.equal((await requireTenantAdmin(new Request('https://example.test'),1)).error.status,401);
  assert.equal((await requireTenantAdmin(new Request('https://example.test',{headers:{authorization:'Bearer fake'}}),1)).error.status,403);
});

test('apex sign-in hands a session to a valid tenant without query-string credentials', async () => {
  const { tenantSessionUrl } = await moduleFrom('src/lib/tenant-session-url.js');
  const url=new URL(tenantSessionUrl('valid-artist',{access_token:'test-access',refresh_token:'test-refresh'}));
  assert.equal(url.origin,'https://valid-artist.fans-flock.com');
  assert.equal(url.search,'');
  assert.equal(new URLSearchParams(url.hash.slice(1)).get('fl_at'),'test-access');
  assert.equal(tenantSessionUrl('evil.test/path',{}),null);
});
