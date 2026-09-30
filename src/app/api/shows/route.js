import { NextResponse } from 'next/server';
import { requireTenantAdmin } from '@/lib/api-auth';

export async function POST(request) {
  const { tenantId } = await request.json();
  const { db, error } = await requireTenantAdmin(request, tenantId);
  if (error) return error;
  const { data, error: queryError } = await db.from('shows').select('*').eq('tenant_id', tenantId).order('date');
  if (queryError) return NextResponse.json({ error: 'Could not load shows' }, { status: 500 });
  return NextResponse.json({ shows: data || [] });
}
