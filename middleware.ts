import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

// ── Route config ──────────────────────────────────────────────────────────────
const PUBLIC_FILE_REGEX = /\.(.*)$/

// Prefixes that skip ALL middleware logic (static assets, auth API)
const BYPASS_PREFIXES = [
    '/_next/static',
    '/_next/image',
    '/favicon.ico',
    '/api/auth',
  ]

// Paths that get tenant resolution but do NOT require authentication
const AUTH_PATHS = ['/login', '/signup', '/auth/callback', '/auth/confirm']

// Paths that require a valid session
const PROTECTED_PREFIXES = ['/dashboard', '/send-reward']

// ── Main middleware ───────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    const host = request.headers.get('host') ?? ''

  // 1. Skip static assets and auth API routes entirely
  if (
        BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
        PUBLIC_FILE_REGEX.test(pathname)
      ) {
        return NextResponse.next()
  }

  // 2. Resolve tenant slug from host
  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'fans-flock.com'
    let tenantSlug: string | null = null

  if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
        tenantSlug = process.env.DEV_TENANT_SLUG ?? 'the-stamps'
  } else if (host.endsWith(`.${appDomain}`)) {
        tenantSlug = host.replace(`.${appDomain}`, '')
  } else {
        tenantSlug = await resolveCustomDomain(host)
  }

  // 3. No tenant found - redirect to marketing homepage
  if (!tenantSlug) {
        const marketingUrl = new URL(`https://${appDomain}`)
        return NextResponse.redirect(marketingUrl)
  }

  // 4. Build response with x-tenant-slug header forwarded to server components
  const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-tenant-slug', tenantSlug)

  const response = NextResponse.next({
        request: { headers: requestHeaders },
  })

  // 5. Set RLS context so Supabase policies fire correctly for this tenant
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
                                                // options is typed by @supabase/ssr; cast to any to satisfy
                                                                   // Next.js ResponseCookies.set() overloads in strict mode
                                                                   response.cookies.set(name, value, options as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                                  })
                      },
            },
    }
      )

  await supabase.rpc('set_tenant', { slug: tenantSlug })

  // 6. Auth paths - allow through without session check
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return response
  }

  // 7. Protected paths - require session
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
        const { user } = await updateSession(request, response)
        if (!user) {
                const loginUrl = new URL('/login', request.url)
                loginUrl.searchParams.set('next', pathname)
                return NextResponse.redirect(loginUrl)
        }
  }

  // 8. All other paths (feed, shows, etc.) - refresh session passively
  await updateSession(request, response)
    return response
}

// ── Custom-domain resolver ────────────────────────────────────────────────────
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
                    },
          }
              )
        if (!res.ok) return null
        const rows: { slug: string }[] = await res.json()
        return rows[0]?.slug ?? null
  } catch {
        return null
  }
}

// ── Matcher ───────────────────────────────────────────────────────────────────
export const config = {
    matcher: [
          '/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)',
        ],
}
