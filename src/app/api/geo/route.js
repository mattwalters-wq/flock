import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { headers } from 'next/headers';

export async function POST(request) {
  try {
    const { userId, timezone, language } = await request.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const headersList = headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // Use Vercel's geo headers if available
    const country = headersList.get('x-vercel-ip-country') || null;
    const region = headersList.get('x-vercel-ip-country-region') || null;
    const city = headersList.get('x-vercel-ip-city') || null;
    const lat = headersList.get('x-vercel-ip-latitude') || null;
    const lng = headersList.get('x-vercel-ip-longitude') || null;

    const db = getServiceSupabase();
    await db.from('profiles').update({
      signup_ip: ip,
      signup_country: country,
      signup_city: city,
      signup_lat: lat ? parseFloat(lat) : null,
      signup_lng: lng ? parseFloat(lng) : null,
    }).eq('id', userId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
