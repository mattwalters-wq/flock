import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';
import { getRequestUser } from '@/lib/api-auth';

// Records the signed-in user's own signup location from Vercel's geo headers.
// The user is taken from the access token, not the body, so nobody can
// overwrite another member's profile.
export async function POST(request) {
  try {
    const db = getServiceSupabase();
    const user = await getRequestUser(request, db);
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const h = request.headers;
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const country = h.get('x-vercel-ip-country') || null;
    let city = h.get('x-vercel-ip-city') || null;
    try { if (city) city = decodeURIComponent(city); } catch { /* keep raw */ }
    const lat = parseFloat(h.get('x-vercel-ip-latitude'));
    const lng = parseFloat(h.get('x-vercel-ip-longitude'));

    // Only fill in once — first capture is the signup location.
    await db.from('profiles').update({
      signup_ip: ip,
      signup_country: country,
      signup_city: city,
      signup_lat: Number.isFinite(lat) ? lat : null,
      signup_lng: Number.isFinite(lng) ? lng : null,
    }).eq('id', user.id).is('signup_ip', null);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[geo] error:', err);
    return NextResponse.json({ error: 'Could not record location' }, { status: 500 });
  }
}
