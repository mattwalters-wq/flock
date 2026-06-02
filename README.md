# flock

Multi-tenant fan-community platform for artists. Each artist gets their own
community on a subdomain (`<slug>.fans-flock.com`): a feed (posts, polls,
media, threaded comments), a gamified "stamp" loyalty system with tiers and
rewards, show check-ins, leaderboards, and email digests.

**Stack:** Next.js 14 (App Router) · Supabase (auth / Postgres / storage) ·
Resend (email) · deployed on Vercel.

## Local setup

1. `cp .env.local.example .env.local` and fill in the values.
2. `npm install`
3. `npm run dev`

## Database

The canonical, full schema lives in **`flock-schema.sql`** — run it once in the
SQL editor of a fresh Supabase project. It creates every table, the RLS
policies, the `SECURITY DEFINER` award/check-in/notification functions, and the
security-hardening layer (protected profile columns + tenant-scoped inserts).

Incremental changes applied to existing databases live in **`migrations/`** and
are run in the Supabase SQL editor in filename order. They are idempotent
(`create or replace`, `drop ... if exists`, `if not exists`), so re-running is
safe:

| migration | what it adds |
| --- | --- |
| `comment_likes_table.sql` | the `comment_likes` table + its policies |
| `auto_award_stamps_triggers.sql` | server-side stamp awarding via DB triggers (with rate limiting) |
| `notification_triggers.sql` | in-app notification rows on comment / reply / like |
| `backfill_stamps_april_22.sql` | one-off retroactive stamp backfill |
| `harden_rls_security.sql` | clamps protected profile columns (no self-awarded stamps / self-promotion) and scopes inserts to the writer's own tenant |

`flock-schema.sql` already includes the contents of `harden_rls_security.sql`;
the migration exists to apply the same hardening to databases created before it.

> The old single-tenant `supabase-schema.sql` has been removed — `flock-schema.sql`
> is the single source of truth.
