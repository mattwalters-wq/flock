import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'

const PUBLIC_FILE_REGEX = /\.(.*)$/

const BYPASS_PREFIXES = [
  '/_next/static',
    '/_next/image',
      '/favicon.ico',
        '/api/auth',
        ]

        // Paths on the ROOT domain (fans-flock.com) that skip tenant resolution
        const ROOT_DOMAIN_PATHS = ['/start']

        const AUTH_PATHS = ['/login', '/signup', '/auth/callback', '/auth/confirm']
        const PROTECTED_PREFIXES = ['/dashboard', '/send-reward']

        export async function middleware(request: NextRequest) {
          const { pathname } = request.nextUrl
            const host = request.headers.get('host') ?? ''

              if (
                  BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
                      PUBLIC_FILE_REGEX.test(pathname)
                        ) {
                            return NextResponse.next()
                              }

                                const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'fans-flock.com'

                                  // Root domain paths bypass tenant resolution entirely
                                    const isRootDomain =
                                        host === appDomain ||
                                            host === `www.${appDomain}` ||
                                                (host.startsWith('localhost') && process.env.DEV_ROOT_DOMAIN === 'true')

                                                  if (
                                                      isRootDomain &&
                                                          ROOT_DOMAIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
                                                            ) {
                                                                return NextResponse.next()
                                                                  }

                                                                    // Also whitelist /api/onboarding on the root domain
                                                                      if (isRootDomain && pathname.startsWith('/api/onboarding')) {
                                                                          return NextResponse.next()
                                                                            }

                                                                              let tenantSlug: string | null = null

                                                                                if (host.startsWith('localhost') || host.startsWith('127.0.0.1')) {
                                                                                    tenantSlug = process.env.DEV_TENANT_SLUG ?? 'the-stamps'
                                                                                      } else if (host.endsWith(`.${appDomain}`)) {
                                                                                          tenantSlug = host.replace(`.${appDomain}`, '')
                                                                                            } else {
                                                                                                tenantSlug = await resolveCustomDomain(host)
                                                                                                  }

                                                                                                    if (!tenantSlug) {
                                                                                                        const startUrl = new URL(`https://${appDomain}/start`)
                                                                                                            return NextResponse.redirect(startUrl)
                                                                                                              }

                                                                                                                const requestHeaders = new Headers(request.headers)
                                                                                                                  requestHeaders.set('x-tenant-slug', tenantSlug)
                                                                                                                    const response = NextResponse.next({
                                                                                                                        request: { headers: requestHeaders },
                                                                                                                          })

                                                                                                                            const supabase = createServerClient(
                                                                                                                                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                                                                                                                                    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                                                                                                                                        {
                                                                                                                                              cookies: {
                                                                                                                                                      getAll() {
                                                                                                                                                                return request.cookies.getAll()
                                                                                                                                                                        },
                                                                                                                                                                                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                                                                                                                                                                                          cookiesToSet.forEach(({ name, value, options }) => {
                                                                                                                                                                                                      request.cookies.set(name, value)
                                                                                                                                                                                                                  response.cookies.set(name, value, options as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                                                                                                                                                                                                                            })
                                                                                                                                                                                                                                    },
                                                                                                                                                                                                                                          },
                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                )

                                                                                                                                                                                                                                                  await supabase.rpc('set_tenant', { slug: tenantSlug })

                                                                                                                                                                                                                                                    if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
                                                                                                                                                                                                                                                        return response
                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                            if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
                                                                                                                                                                                                                                                                const { user } = await updateSession(request, response)
                                                                                                                                                                                                                                                                    if (!user) {
                                                                                                                                                                                                                                                                          const loginUrl = new URL('/login', request.url)
                                                                                                                                                                                                                                                                                loginUrl.searchParams.set('next', pathname)
                                                                                                                                                                                                                                                                                      return NextResponse.redirect(loginUrl)
                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                              await updateSession(request, response)
                                                                                                                                                                                                                                                                                                return response
                                                                                                                                                                                                                                                                                                }

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

                                                                                                                                                                                                                                                                                                                                                                                                    export const config = {
                                                                                                                                                                                                                                                                                                                                                                                                      matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api/auth).*)'],
                                                                                                                                                                                                                                                                                                                                                                                                      }