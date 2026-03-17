import { redirect } from 'next/navigation'
import { getTenantSlug } from '@/lib/get-tenant-from-headers'
import { getTenant } from '@/lib/tenant'
import { getSession } from '@/lib/auth'
import AuthForm from '@/components/AuthForm'

export const metadata = { title: 'Create account' }

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect('/')

  const slug = await getTenantSlug()
  const tenant = await getTenant(slug)

  if (!tenant) {
    return (
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif', color: '#666' }}>
        Unable to load tenant.
      </div>
    )
  }

  return <AuthForm mode="signup" tenant={tenant} />
}
