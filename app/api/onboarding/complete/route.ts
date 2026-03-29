import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addSubdomain } from '@/lib/vercel'
import type { OnboardingState } from '@/components/onboarding/OnboardingFlow'

export async function POST(request: Request) {
  try {
      const body = (await request.json()) as OnboardingState
          const { account, community, branding, members } = body

              // Validate required fields
                  if (!account.userId) {
                        return NextResponse.json({ error: 'Missing auth user ID. Please complete step 1.' }, { status: 400 })
                            }
                                if (!community.slug || !community.communityName) {
                                      return NextResponse.json({ error: 'Missing community name or slug.' }, { status: 400 })
                                          }

                                              const supabase = await createClient()

                                                  // 1. Check slug is not already taken
                                                      const { data: existing } = await supabase
                                                            .from('tenants')
                                                                  .select('id')
                                                                        .eq('slug', community.slug)
                                                                              .maybeSingle()

                                                                                  if (existing) {
                                                                                        return NextResponse.json({ error: 'That community URL is already taken. Please choose another.' }, { status: 409 })
                                                                                            }

                                                                                                // 2. Insert tenant
                                                                                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                                                                        const { data: tenant, error: tenantError } = await (supabase
                                                                                                              .from('tenants') as any)
                                                                                                                    .insert({ slug: community.slug, name: community.communityName, custom_domain: null })
                                                                                                                          .select('id')
                                                                                                                                .single() as { data: { id: number } | null; error: unknown }

                                                                                                                                    if (tenantError || !tenant) {
                                                                                                                                          console.error('[onboarding] tenant insert error:', tenantError)
                                                                                                                                                return NextResponse.json({ error: 'Failed to create community. Please try again.' }, { status: 500 })
                                                                                                                                                    }

                                                                                                                                                        const tenantId = (tenant as { id: number }).id

                                                                                                                                                            // 3. Insert tenant_config rows
                                                                                                                                                                const configRows = [
                                                                                                                                                                      { tenant_id: tenantId, key: 'tagline', value: community.tagline || null },
                                                                                                                                                                            { tenant_id: tenantId, key: 'color_ruby', value: branding.primaryColor },
                                                                                                                                                                                  { tenant_id: tenantId, key: 'color_blush', value: branding.secondaryColor },
                                                                                                                                                                                      ]

                                                                                                                                                                                          const { error: configError } = await supabase.from('tenant_config').insert(configRows as any)
                                                                                                                                                                                              if (configError) {
                                                                                                                                                                                                    console.error('[onboarding] config insert error:', configError)
                                                                                                                                                                                                        }

                                                                                                                                                                                                            // 4. Insert tenant_members rows
                                                                                                                                                                                                                const memberRows = members
                                                                                                                                                                                                                      .filter((m) => m.name?.trim())
                                                                                                                                                                                                                            .map((m, i) => ({
                                                                                                                                                                                                                                    tenant_id: tenantId,
                                                                                                                                                                                                                                            slug: m.name.trim().toLowerCase().replace(/\s+/g, '-'),
                                                                                                                                                                                                                                                    name: m.name.trim(),
                                                                                                                                                                                                                                                            accent_color: m.color,
                                                                                                                                                                                                                                                                    display_order: i,
                                                                                                                                                                                                                                                                          }))

                                                                                                                                                                                                                                                                              if (memberRows.length > 0) {
                                                                                                                                                                                                                                                                                    const { error: membersError } = await supabase.from('tenant_members').insert(memberRows as any)
                                                                                                                                                                                                                                                                                          if (membersError) {
                                                                                                                                                                                                                                                                                                  console.error('[onboarding] members insert error:', membersError)
                                                                                                                                                                                                                                                                                                        }
                                                                                                                                                                                                                                                                                                            }

                                                                                                                                                                                                                                                                                                                // 5. Insert flock_accounts row
                                                                                                                                                                                                                                                                                                                    const { error: accountError } = await supabase.from('flock_accounts').insert({
                                                                                                                                                                                                                                                                                                                          auth_user_id: account.userId,
                                                                                                                                                                                                                                                                                                                                full_name: account.fullName,
                                                                                                                                                                                                                                                                                                                                      email: account.email,
                                                                                                                                                                                                                                                                                                                                            tenant_id: tenantId,
                                                                                                                                                                                                                                                                                                                                                } as any)
                                                                                                                                                                                                                                                                                                                                                    if (accountError) {
                                                                                                                                                                                                                                                                                                                                                          console.error('[onboarding] flock_accounts insert error:', accountError)
                                                                                                                                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                                                                                                                                  // 6. Add subdomain via Vercel API
                                                                                                                                                                                                                                                                                                                                                                      const vercelResult = await addSubdomain(community.slug)
                                                                                                                                                                                                                                                                                                                                                                          if (!vercelResult.ok) {
                                                                                                                                                                                                                                                                                                                                                                                // Non-fatal — log but don't fail the request. DNS may take a moment.
                                                                                                                                                                                                                                                                                                                                                                                      console.error('[onboarding] Vercel subdomain error:', vercelResult.error)
                                                                                                                                                                                                                                                                                                                                                                                          }

                                                                                                                                                                                                                                                                                                                                                                                              const redirectUrl = `https://${community.slug}.fans-flock.com?welcome=1`
                                                                                                                                                                                                                                                                                                                                                                                                  return NextResponse.json({ redirectUrl }, { status: 200 })
                                                                                                                                                                                                                                                                                                                                                                                                    } catch (err) {
                                                                                                                                                                                                                                                                                                                                                                                                        console.error('[onboarding] unexpected error:', err)
                                                                                                                                                                                                                                                                                                                                                                                                            return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                              }