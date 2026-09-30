import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { getRequestUser } from '@/lib/api-auth';

export async function POST(request) {
  const db = getServiceSupabase();
  const user = await getRequestUser(request, db);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { data, error } = await db.from('profiles').select('referral_code, signup_ip').eq('id', user.id).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load profile' }, { status: 500 });
  return NextResponse.json({ referral_code: data?.referral_code || null, geo_recorded: !!data?.signup_ip });
}
