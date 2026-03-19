/**
 *  * lib/vercel.ts
  *
   * Vercel API helpers for the Flock onboarding flow.
    * Adds a subdomain to the flock Vercel project so artist sites go live instantly.
     *
      * Required env vars (server-side only, never NEXT_PUBLIC_):
       *   VERCEL_API_TOKEN   - Vercel personal access token with project write scope
        *   VERCEL_PROJECT_ID  - ID of the Vercel project to add domains to
         *   VERCEL_TEAM_ID     - (optional) team ID if project is under a team
          */

          const VERCEL_API = 'https://api.vercel.com'

          function headers() {
            const token = process.env.VERCEL_API_TOKEN
              if (!token) throw new Error('VERCEL_API_TOKEN is not set')
                return {
                    Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                          }
                          }

                          function projectParams() {
                            const projectId = process.env.VERCEL_PROJECT_ID
                              if (!projectId) throw new Error('VERCEL_PROJECT_ID is not set')
                                const teamId = process.env.VERCEL_TEAM_ID
                                  return { projectId, teamId: teamId ?? null }
                                  }

                                  export type AddSubdomainResult =
                                    | { ok: true; domain: string }
                                      | { ok: false; error: string }

                                      /**
                                       * Adds `{slug}.fans-flock.com` as a domain on the Vercel project.
                                        * Idempotent - safe to call if the domain already exists.
                                         */
                                         export async function addSubdomain(slug: string): Promise<AddSubdomainResult> {
                                           const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'fans-flock.com'
                                             const domain = `${slug}.${appDomain}`

                                               try {
                                                   const { projectId, teamId } = projectParams()
                                                       const url = new URL(`${VERCEL_API}/v10/projects/${projectId}/domains`)
                                                           if (teamId) url.searchParams.set('teamId', teamId)

                                                               const res = await fetch(url.toString(), {
                                                                     method: 'POST',
                                                                           headers: headers(),
                                                                                 body: JSON.stringify({ name: domain }),
                                                                                     })

                                                                                         if (res.ok || res.status === 409) {
                                                                                               // 409 = domain already exists on project - treat as success
                                                                                                     return { ok: true, domain }
                                                                                                         }

                                                                                                             const body = await res.json().catch(() => ({}))
                                                                                                                 const message =
                                                                                                                       (body as { error?: { message?: string } }).error?.message ??
                                                                                                                             `Vercel API error ${res.status}`
                                                                                                                                 return { ok: false, error: message }
                                                                                                                                   } catch (err) {
                                                                                                                                       return {
                                                                                                                                             ok: false,
                                                                                                                                                   error: err instanceof Error ? err.message : 'Unknown error adding subdomain',
                                                                                                                                                       }
                                                                                                                                                         }
                                                                                                                                                         }

                                                                                                                                                         /**
                                                                                                                                                          * Removes `{slug}.fans-flock.com` from the Vercel project.
                                                                                                                                                           * Used if onboarding is rolled back.
                                                                                                                                                            */
                                                                                                                                                            export async function removeSubdomain(slug: string): Promise<AddSubdomainResult> {
                                                                                                                                                              const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'fans-flock.com'
                                                                                                                                                                const domain = `${slug}.${appDomain}`

                                                                                                                                                                  try {
                                                                                                                                                                      const { projectId, teamId } = projectParams()
                                                                                                                                                                          const url = new URL(`${VERCEL_API}/v10/projects/${projectId}/domains/${domain}`)
                                                                                                                                                                              if (teamId) url.searchParams.set('teamId', teamId)

                                                                                                                                                                                  const res = await fetch(url.toString(), {
                                                                                                                                                                                        method: 'DELETE',
                                                                                                                                                                                              headers: headers(),
                                                                                                                                                                                                  })

                                                                                                                                                                                                      if (res.ok || res.status === 404) {
                                                                                                                                                                                                            return { ok: true, domain }
                                                                                                                                                                                                                }

                                                                                                                                                                                                                    const body = await res.json().catch(() => ({}))
                                                                                                                                                                                                                        const message =
                                                                                                                                                                                                                              (body as { error?: { message?: string } }).error?.message ??
                                                                                                                                                                                                                                    `Vercel API error ${res.status}`
                                                                                                                                                                                                                                        return { ok: false, error: message }
                                                                                                                                                                                                                                          } catch (err) {
                                                                                                                                                                                                                                              return {
                                                                                                                                                                                                                                                    ok: false,
                                                                                                                                                                                                                                                          error: err instanceof Error ? err.message : 'Unknown error removing subdomain',
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                }