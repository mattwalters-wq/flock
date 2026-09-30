// Single source of truth for the flock platform owner ("god admin").
//
// Authorize the verified owner account by its immutable auth id. Email addresses
// are editable and must never grant platform privileges.
export const SUPER_ADMIN_ID = '5cdcf898-6bda-42b7-860e-0964562c9c22';
export const GOD_EMAIL = 'matt.walters@unifiedmusicgroup.com';

export function isGod(user) {
  if (!user) return false;
  return user.id === SUPER_ADMIN_ID;
}
