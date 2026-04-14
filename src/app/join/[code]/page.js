import { redirect } from 'next/navigation';
import { getServiceSupabase } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export default async function JoinPage({ params }) {
  const { code } = params;
  const headersList = headers();
  const tenantSlug = headersList.get('x-tenant-slug');

  if (code && tenantSlug) {
    const db = getServiceSupabase();
    const { data: tenant } = await db.from('tenants').select('id').eq('slug', tenantSlug).single();
    if (tenant) {
      // Store referral code in cookie via redirect with query param
      redirect(`/?ref=${code}`);
    }
  }

  redirect('/');
}
