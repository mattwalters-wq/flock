import { headers } from 'next/headers'

/**
 * Reads the x-tenant-slug header injected by middleware.ts.
 *
 * Call this at the top of any Server Component or Route Handler that needs
 * to know which tenant is active.
 *
 * @returns The tenant slug string (e.g. "the-stamps", "some-artist")
 * @throws  If the header is missing — which means middleware didn't run,
 *          which should never happen in normal operation.
 *
 * @example
 *   import { getTenantSlug } from '@/lib/get-tenant-from-headers'
 *   import { getTenant } from '@/lib/tenant'
 *
 *   export default async function Page() {
 *     const slug = await getTenantSlug()
 *     const tenant = await getTenant(slug)
 *     // ...
 *   }
 */
export async function getTenantSlug(): Promise<string> {
  const headerStore = await headers()
  const slug = headerStore.get('x-tenant-slug')

  if (!slug) {
    throw new Error(
      '[getTenantSlug] x-tenant-slug header is missing. ' +
        'Ensure middleware.ts is running and the matcher covers this route.'
    )
  }

  return slug
}
