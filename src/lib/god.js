// Single source of truth for the flock platform owner ("god admin").
//
// Recognised by either the hardcoded super-admin auth id OR the owner email, so
// it keeps working whether the owner logs in with that account id or just the
// email. Mirror of the SQL is_god() used by RLS (migrations/god_mode.sql) — keep
// the id and email in sync across both.
export const SUPER_ADMIN_ID = '5cdcf898-6bda-42b7-860e-0964562c9c22';
export const GOD_EMAIL = 'matt.walters@unifiedmusicgroup.com';

export function isGod(user) {
  if (!user) return false;
  return user.id === SUPER_ADMIN_ID || (user.email || '').toLowerCase() === GOD_EMAIL;
}
