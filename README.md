# flock

Multi-tenant fan-community platform for artists. Each artist gets their own
community on a subdomain (`<slug>.fans-flock.com`): a feed (posts, polls,
media, threaded comments), a gamified "stamp" loyalty system with tiers and
rewards, show check-ins, leaderboards, and email digests.

**Stack:** Next.js 15 (App Router) · React 19 · Supabase (auth / Postgres / storage) ·
Resend (email) · deployed on Vercel.

## Local setup

1. `cp .env.local.example .env.local` and fill in the values.
2. `npm install`
3. `npm run dev`

## API route auth

Every `/api` route that reads private data or sends email/push on a
community's behalf identifies the caller from their Supabase access token
(`Authorization: Bearer <jwt>`, attached by `authFetch()` in
`src/lib/supabase-browser.js`) and checks it with `requireTenantAdmin()` /
`getRequestUser()` in `src/lib/api-auth.js`. Never accept a user id from the
request body as proof of identity.

## Database

**`flock-schema.sql` is a historical base schema, not a complete current bootstrap.**
The deployed database also contains incremental tables, columns, functions and
policies. A fresh project needs a reconciled schema export and staging validation
before it can run the current app. See `audit/2026-09-30-app-review.md`.

Incremental changes applied to existing databases live in **`migrations/`** and
are applied in reviewed dependency order. Do not run them alphabetically:
older files can restore permissive policies over newer hardening. Run the final
lockdown only after the coordinated app changes below:

| migration | what it adds |
| --- | --- |
| `comment_likes_table.sql` | the `comment_likes` table + its policies |
| `auto_award_stamps_triggers.sql` | server-side stamp awarding via DB triggers (with rate limiting) |
| `notification_triggers.sql` | in-app notification rows on comment / reply / like |
| `backfill_stamps_april_22.sql` | one-off retroactive stamp backfill |
| `harden_rls_security.sql` | clamps protected profile columns (no self-awarded stamps / self-promotion) and scopes inserts to the writer's own tenant |
| `add_email_broadcasts.sql` | the `email_broadcasts` send-history table behind the dashboard's "email your fans" card and its past-messages list |
| `grant_table_privileges.sql` | grants app-role privileges on `email_broadcasts`, `push_subscriptions` and `comment_likes` (created without them, so every read/write was denied before RLS) and sets default privileges for future tables |
| `security_lockdown.sql` | **run after all of the above.** Revokes browser access to the internal `SECURITY DEFINER` functions (stamp awarding, notifications, referral counts), blocks self-promotion to admin on profile insert and tenant-hopping on update, restricts post/reward-claim/stamp-history writes, dedupes like-farming, fixes `checkin_show`, and adds the `complete_referral()` RPC the app now uses. New functions are no longer executable by `anon`/`authenticated` by default — `GRANT EXECUTE` each new RPC explicitly. |

The revised `security_lockdown.sql` also scopes storage ownership, protects
exclusive post reads, and removes public access to signup geo/IP, referral codes,
and show check-in codes. Deploy it with the explicit client column projections
and `/api/profile` / `/api/shows` authorization changes. Add `shows.has_checkin`
(the generated boolean defined in section 10) before deploying the app, then
apply the full lockdown after deployment. Existing browser `select('*')` calls
must be removed before private-column grants are revoked.

`tests/database-security.sql` is a rollback-only fixture test: append it in place
of the lockdown's final `COMMIT` when validating, never run it as a permanent
migration. `npm test`, `npm run lint`, and `npm run build` cover local checks.

> The old single-tenant `supabase-schema.sql` has been removed — `flock-schema.sql`
> remains a base snapshot pending a reconciled current schema export.
