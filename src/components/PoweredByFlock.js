// Quiet, editorial "powered by flock" line shown by default at the foot of every
// tenant-facing page. Rendered once from the shared root layout (not duplicated
// per page) and suppressed when a tenant has hide_branding set.
//
// The link carries UTM params identifying the referring tenant so signups driven
// from tenant sites are attributable. Colours use the tenant theme CSS vars set
// in layout.js, so it respects light/dark and each tenant's palette.
//
// Generous bottom padding clears the fixed bottom nav in the fan app (FlockApp)
// so the line is never hidden behind it; on pages without a nav it simply reads
// as whitespace.
export function PoweredByFlock({ slug }) {
  const href = `https://fans-flock.com?utm_source=tenant&utm_campaign=${encodeURIComponent(slug || '')}`;
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '28px 20px calc(80px + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'DM Mono', monospace",
        fontSize: 10,
        letterSpacing: '0.5px',
        color: 'var(--slate)',
        opacity: 0.55,
      }}
    >
      powered by{' '}
      <a href={href} style={{ color: 'var(--ruby)', textDecoration: 'none', fontWeight: 500 }}>
        flock
      </a>
    </div>
  );
}
