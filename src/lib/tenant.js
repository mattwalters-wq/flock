import { getServiceSupabase } from './supabase-server';

export async function getTenantBySlug(slug) {
  const db = getServiceSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!tenant) return null;

  const [configResult, membersResult] = await Promise.all([
    db.from('tenant_config').select('key, value').eq('tenant_id', tenant.id),
    db.from('tenant_members').select('*').eq('tenant_id', tenant.id).order('display_order'),
  ]);

  const config = {};
  (configResult.data || []).forEach(({ key, value }) => { config[key] = value; });

  return {
    ...tenant,
    config,
    members: membersResult.data || [],
  };
}

export async function getTenantByDomain(domain) {
  const db = getServiceSupabase();
  const { data: tenant } = await db
    .from('tenants')
    .select('slug')
    .eq('custom_domain', domain)
    .single();

  if (!tenant) return null;
  return getTenantBySlug(tenant.slug);
}

// Palette values are artist-editable config that ends up inside an inline
// <style> tag (layout.js), so only accept plain colour literals — anything else
// (e.g. `red}</style><script>…`) falls back to the default.
const COLOR_RE = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([0-9.,%\s/]+\)|[a-z]{3,20})$/i;
const safeColor = (v, fallback) => (typeof v === 'string' && COLOR_RE.test(v.trim()) ? v.trim() : fallback);

// Get palette from tenant config with fallbacks
export function getTenantPalette(tenant) {
  const c = tenant?.config || {};
  return {
    ink: safeColor(c.color_ink, '#1A1018'),
    cream: safeColor(c.color_cream, '#F5EFE6'),
    ruby: safeColor(c.color_ruby, '#8B1A2B'),
    blush: safeColor(c.color_blush, '#D4A5A0'),
    warmGold: safeColor(c.color_warm_gold, '#C9922A'),
    slate: safeColor(c.color_slate, '#6A5A62'),
    surface: safeColor(c.color_surface, '#FAF5F0'),
    border: safeColor(c.color_border, '#E8DDD4'),
  };
}

// Build member map from tenant members
export function getTenantMemberMap(tenant) {
  const map = {};
  (tenant?.members || []).forEach(m => {
    map[m.slug] = {
      name: m.name,
      slug: m.slug,
      accentColor: m.accent_color || '#888888',
      bio: m.bio || '',
      displayOrder: m.display_order || 0,
    };
  });
  return map;
}
