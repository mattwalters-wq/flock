import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Paths that bypass tenant resolution entirely
const PUBLIC_FILE_REGEX = /\.(.*)$/
const BYPASS_PREFIXES = ['/_next/static', '/_next/image', '/favicon.ico', '/api/auth']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''

  // Skip static assets and auth API routes
  if (
    BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE_REGEX.test(pathname)
  ) {
    return NextResponse.next()
  }

  // ── Platform domain (configurable via env) ────────────────────────────────
  // Set NEXT_PUBLIC_APP_DOMAIN=fans-flock.com in your environment.
  // Defaults to fans-flock.com if not set.
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'fans-flock.com'

  // ── Resolve tenant slug from host ──────────────────────────────────────────

  let tenantSlug: string | null = null

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
    // Development default
    tenantSlug = process.env.DEV_TENANT_SLUG ?? 'the-stamps'
  } else if (host.endsWith(`.${appDomain}`)) {
    // Subdomain routing: <slug>.fans-flock.com
    tenantSlug = host.replace(`.${appDomain}`, '')
  } else {
    // Custom domain — look up in Supabase
    tenantSlug = await resolveCustomDomain(host)
  }

  // ── Tenant not found → redirect to marketing homepage ─────────────────────

  if (!tenantSlug) {
    const marketingUrl = new URL(`https://${appDomain}`)
    return NextResponse.redirect(marketingUrl)
  }

  // ── Forward slug to server components via request header ──────────────────

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)

  // ── Set RLS context so Supabase policies fire correctly ───────────────────

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Call the SQL helper so every subsequent query on this request sees the right tenant
  await supabase.rpc('set_tenant', { slug: tenantSlug })

  return response
}

// ── Custom-domain resolver ─────────────────────────────────────────────────────
// Runs a lightweight direct fetch so we don't import the full createClient here.
async function resolveCustomDomain(domain: string): Promise<string | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) return null

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/tenants?custom_domain=eq.${encodeURIComponent(domain)}&select=slug&limit=1`,
      {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: 'application/json',
feat: make platform domain configurable via NEXT_PUBLIC_APP_DOMAIN env var (fans-flock.com)      }
    )

    if (!res.ok) return null
    const rows: { slug: string }[] = await res.json()
    return rows[0]?.slug ?? null
  } catch {
    return null
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - /api/auth/*  (auth callbacks)
     */
    '/((?!_next/static|_next/image|favicon\.ico|api/auth).*)',
  ],
}
