import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    if (!tenantId) return NextResponse.json({ error: 'missing tenantId' }, { status: 400 });

    const db = getServiceSupabase();

    // Get bandsintown config from tenant_config
    const { data: configs } = await db.from('tenant_config').select('key, value').eq('tenant_id', tenantId).in('key', ['bandsintown_artist', 'bandsintown_app_id']);
    const cfg = {};
    (configs || []).forEach(({ key, value }) => { cfg[key] = value; });

    const artist = cfg.bandsintown_artist;
    const appId = cfg.bandsintown_app_id;

    if (!artist || !appId) return NextResponse.json({ events: [], error: 'bandsintown not configured' });

    const encodedArtist = encodeURIComponent(artist);
    const res = await fetch(`https://rest.bandsintown.com/artists/${encodedArtist}/events?app_id=${appId}&date=upcoming`, {
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      console.error('[bandsintown] API error:', res.status, await res.text());
      return NextResponse.json({ events: [], error: `API returned ${res.status}` });
    }

    const events = await res.json();

    // Map to a clean format
    const mapped = (Array.isArray(events) ? events : []).map(e => ({
      id: e.id,
      date: e.datetime,
      venue: e.venue?.name || '',
      city: e.venue?.city || '',
      region: e.venue?.region || '',
      country: e.venue?.country || '',
      latitude: e.venue?.latitude,
      longitude: e.venue?.longitude,
      ticket_url: e.url || e.offers?.[0]?.url || '',
      ticket_status: e.offers?.[0]?.status || '',
      description: e.description || '',
      lineup: e.lineup || [],
      on_sale_datetime: e.on_sale_datetime || null,
    }));

    return NextResponse.json({ events: mapped });
  } catch (err) {
    console.error('[bandsintown] error:', err);
    return NextResponse.json({ events: [], error: err.message }, { status: 500 });
  }
}
