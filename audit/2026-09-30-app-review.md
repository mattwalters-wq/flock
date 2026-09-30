# Flock app review — 30 September 2026

Repository: https://github.com/mattwalters-wq/flock

Reviewed baseline: `9fc28cb` (main). Local fixes are on `codex/comprehensive-app-audit` in this checkout. Production was inspected read-only. Database validation temporarily installed the patch and fixture rows inside transactions ending in ROLLBACK; no patch or fixture rows were retained.

**Release assessment: production has critical access-control gaps. Do not treat the previous hardening PR as deployed database protection.** This is a broad source/configuration review and targeted verification, not a guarantee of complete security or a full penetration test.

| Dimension | Assessment | Positive evidence |
| --- | --- | --- |
| Security | Critical production issues; tested local fixes prepared | Service key stays server-side; API authentication checks real Supabase users; all 22 production public tables have RLS; baseline response headers are present |
| Correctness | Material reliability issues; several fixed | Production build succeeds; API authorization is centralized; batch email and database reads paginate |
| Performance | Follow-up needed | Feed queries paginate; independent requests run in parallel; email uses batches |
| Maintainability | Follow-up needed | Shared helpers exist; explicit projections and repeatable security tests now added |

## Verified findings and prepared fixes

1. **Critical — live database exposes privileged RPCs and unrestricted writes.** `award_stamps` and `create_notification` are SECURITY DEFINER and executable by anon/authenticated. `notifications_insert` and `stamp_tx_insert` have `WITH CHECK (true)`; attendance is directly insertable. This enables forged notification/history writes and unauthorized stamp awards. Production has no `complete_referral` function or `action_dedupe` table. The existing `migrations/security_lockdown.sql` had not been applied. Prepared: revoke internal RPC execution, restrict direct writes, protect profile inserts/updates, validate reward eligibility and tenant relationships, dedupe like awards, repair check-in/referral paths.

2. **Critical — stored XSS in an artist/admin map.** `src/app/dashboard/page.js`, FanMap, interpolated a fan-controlled display name directly into Leaflet HTML. An attacker can target an artist's browser with markup. Prepared: escape every interpolated string in the popup. The targeted escaping test passes.

3. **High — media overwrites lack ownership and tenant checks.** Live storage UPDATE checks only `bucket_id = 'media'`, allowing authenticated users to overwrite another community's assets. Prepared: scoped INSERT and UPDATE policies, validating tenant paths and owner/admin permissions. Tested allowed own-avatar upload/update, denied other-owner and cross-tenant overwrites, denied cross-tenant upload, and denied fan branding upload inside rollback fixtures. Storage policies are still unchanged in production.

4. **High — public profile reads expose signup IP/location and referral codes; public show reads expose check-in codes.** Live anon table SELECT privileges plus public read policies permit these fields to be fetched directly. Prepared: column-level grants, explicit browser projections, `/api/profile` for the caller's own referral code and geo-recorded boolean, and `/api/shows` for authorized community administrators. Show availability is exposed as `has_checkin`, without disclosing the code. Denied private-column reads were verified under the authenticated database role.

5. **High — exclusive post access is enforced by UI rather than live RLS.** Production `posts_read` is `true`, so a signed-out direct API caller can read exclusive text even if the landing page blurs it. Prepared: member-scoped RLS for exclusive posts and related comments/likes/votes. An anonymous read denial passed against rollback fixtures. Exclusive *media* still needs the storage work below.

6. **High — server fetches have SSRF gaps.** Link previews validate DNS and then fetch using a new resolution, allowing DNS rebinding; mapped hexadecimal IPv6 addresses evade the original private-IP check. Push delivery also trusted client-written subscription URLs. Prepared: pinned-address HTTP(S) connections, redirect revalidation, non-global IPv6 rejection, and a browser push-service allowlist. Tests cover internal IP spellings, mixed DNS answers, nonstandard ports and malicious push hosts. A real local public link preview succeeded; localhost preview returned 400.

7. **High — editable email can grant platform-owner access.** Both JavaScript and live SQL recognize an owner email as well as a UUID. Onboarding auto-confirms addresses, so email ownership cannot safely serve as this authorization boundary. The owner UUID/email correspondence was verified in auth.users. Prepared: authorize the immutable owner UUID in JavaScript and SQL only. Test rejects the owner email on a different account.

8. **Medium — middleware sets response tenant headers instead of forwarding trusted request headers.** Layout reads request headers, so branding/tenant resolution can fail; caller-supplied tenant headers can also be trusted. Prepared: strip supplied routing headers and forward host-derived values through `NextResponse.next({ request: { headers } })`. Tests check valid tenant forwarding and forged apex header removal.

9. **Medium — billing webhook acknowledges failed writes.** Supabase returns an error object rather than throwing; failures were ignored, and catch also returned 200. Prepared: inspect write errors and return 500 so Stripe retries. Signature validation now rejects nonnumeric timestamps and accepts multiple rotation signatures. Tests cover failed database writes, expired/malformed signatures and tampered bodies. Event ordering, duplicate subscriptions and referral credit consumption still need the billing work below.

10. **Medium — apex login redirects into a different origin without carrying its session.** Password and OAuth sign-ins can arrive at the community logged out. Prepared: apply the existing onboarding fragment-session handoff to both paths, with strict slug validation. Tokens stay out of query strings and are scrubbed by AuthProvider. Full signed-in end-to-end validation remains outstanding; no production account was created or used.

11. **Quality/check infrastructure.** `npm run lint` previously opened an interactive setup prompt. A malformed unused LandingPage had an unfinished try block, which the production bundle did not include. Prepared: explicit ESLint configuration, a noninteractive lint script, ten meaningful security regression tests and the syntax repair. Browser zoom is restored; broken `og-community.png` references now use the existing `og.png`; Next's build-tracing root is explicit. Eight local public pages/assets returned 200.

12. **Dependencies.** Initial npm audit found two high-severity vulnerable packages: brace-expansion and js-yaml, in the development dependency tree. Compatible lockfile updates now produce zero known vulnerabilities. This measures published npm advisories at audit time; it does not prove supply-chain safety.

## Verification completed

- `npm run build`: passed after the final source changes (Next 15.5.26, React 19.3.0, Node 24.14.0).
- `npm run lint`: zero errors; 59 warnings remain for hooks, images and full-page navigation. The existing unescaped-prose and page-font rules are disabled explicitly. Navigation is warning-level because the app currently relies on full-document auth/session transitions.
- `npm test`: ten tests pass. External services are stubbed for route/authorization unit tests; they are not live integration tests.
- Local HTTP smoke tests: all eleven sensitive endpoints tested returned 401 without authorization; public marketing, login, onboarding, contact, privacy, terms, manifest and OG image returned 200. No emails, billing calls or onboarding submissions were made.
- SQL patch executed against Flock's current schema inside ROLLBACK. Privilege assertions and behavior tests passed. Profile self-promotion, tenant-crossing writes, private-column reads, and exclusive-post anonymous reads were denied; normal fan post and own-avatar insert were allowed.
- Public live browser: marketing, login, recovery UI and Dustin Tebbutt community render. No captured warn/error console entries on the inspected pages. This was a narrow/mobile-sized view, not a complete device/browser matrix. The stale `.env.local.example` tenant `the-stamps` was not present in the live database.
- Public response headers: CSP frame-ancestors/base-uri/object-src, X-Frame-Options, nosniff, referrer policy, HSTS and permissions policy observed after the apex-to-www redirect.
- Current tracked source pattern scan found no matching embedded JWTs, private keys or long Stripe/Resend credential strings. Only `.env.local.example` is tracked as an environment file, including in history's file-name inventory. Historical file contents and all secret formats were not exhaustively scanned.
- Supabase security and performance advisors inspected. All 22 public tables have RLS, but this did not make permissive policies safe. Initial security advisors reported 15 mutable function search paths, 15 anonymously executable definer functions and 16 authenticated-executable definer functions. These counts include legitimate helpers/trigger functions and are not each separate exploits.

## Remaining work, in priority order

1. **Deploy the coordinated app/database patch.** The local fixes do not protect production until deployed. Add `shows.has_checkin` ahead of app deployment; deploy the app's explicit projections and authenticated routes; then execute the full revised lockdown transaction. Otherwise old browser `select('*')` queries or new availability queries can fail during rollout. Re-run advisors and signed-in tests after deployment. Keep old hardening migrations from running later and restoring permissive policies.
2. **Private exclusive media.** Production's media bucket is public, has a 400 MiB upload limit and no MIME allowlist. Separate public branding from member-only files, migrate existing exclusive assets, use short-lived signed URLs and remove public copies. Do not simply mark the whole current bucket private: that would break public branding/media URLs. Restrict upload types and quotas. Public buckets bypass download access control; see the Supabase reference below.
3. **Durable abuse controls and verified onboarding.** Add distributed per-IP/account/tenant limits and bot protection to onboarding/contact/invites/broadcast/welcome/link preview. Server-side onboarding currently calls `auth.admin.createUser({ email_confirm: true })` and bypasses normal public signup verification/rate controls. Welcome email's 15-minute age check does not dedupe repeated sends. Batch helpers report partial failure but do not retry or reserve an idempotent send. Use a durable queue/idempotency ledger before enabling high-volume operations.
4. **Billing reconciliation.** Record webhook event IDs, prevent older events from replacing current subscription state, and retrieve authoritative Stripe state when needed. Use idempotency keys and a unique reservation for customer/checkout creation. Credits are consumed on checkout-session creation, even if the artist abandons checkout, and parallel checkouts can race. Test paid/trialing/canceled/failed-payment paths in Stripe test mode before production release.
5. **Membership/data model.** Live `profiles` has `PRIMARY KEY(id)`, not `(id, tenant_id)`. One auth user cannot have independent profiles in multiple communities; later profile inserts fail and callers often ignore errors. Introduce membership IDs and tenant-aware foreign keys before advertising multi-community membership. Complete custom-domain routing too: layout contains a custom-domain branch, but middleware never selects it and the client home page redirects non-Flock hosts to marketing.
6. **Deployment reproducibility.** README overstates the completeness of `flock-schema.sql`. The base schema lacks current tables/columns/functions and does not incorporate this lockdown. Alphabetical migration execution can regress prior hardening. Adopt a generated full schema and ordered migration history, then prove a fresh staging bootstrap from an empty database.
7. **Performance.** Advisors flagged 22 unindexed foreign keys, 31 RLS auth-initplan cases, one duplicate index, four unused-index notices and 250 overlapping-permissive-policy combinations. Profile/tenant helpers should use cached auth evaluations where appropriate. Fan/email endpoints scan the entire auth user directory and multiple activity tables for each tenant request; replace with scoped aggregates/a maintained recipient lookup and queued sends. Push delivery currently starts all recipients in parallel; cap concurrency and set timeouts. Measure before removing indexes or blanket-adding them.
8. **Accessibility and polish.** Associate email/password labels with inputs, add modal focus containment/escape handling, replace click-only show cards with semantic links/buttons, audit color contrast across tenant palettes and keyboard navigation. Resize/crop uploaded images through an image service, replace public-page img tags selectively, and reduce the global font payload. The zoom/OG fixes are implemented; a full WCAG audit was not performed.
9. **Defense in depth.** Replace raw cross-origin session-fragment transfer with a short-lived one-time exchange. Adopt a nonce-based full script CSP after removing inline third-party scripts. Review Supabase auth settings (email confirmation, password protection/MFA, redirect allowlist), realtime publication exposure, Vercel WAF configuration, backup recovery and logs. These settings were not fully accessible/verified in this pass; Vercel's connected team listing returned no teams.

No real send, payment, account deletion, production release or permanent database policy change occurred during this review. Remaining work is explicitly outstanding; this app should not yet be described as entirely secure.

## References

- Supabase RLS and role/column access: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase public/private storage behavior: https://supabase.com/docs/guides/storage/serving/downloads
- Supabase storage policies: https://supabase.com/docs/guides/storage/security/access-control
- Stripe webhook retries and event handling: https://docs.stripe.com/webhooks
- Next CLI/lint configuration: https://nextjs.org/docs/app/api-reference/cli/next
