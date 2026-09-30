// Explicit public projections allow the database to deny private column reads.
export const PROFILE_COLUMNS = 'id, tenant_id, display_name, avatar_url, bio, city, stamp_count, stamp_level, role, band_member, show_count, referral_count, email_notifications, joined_at, created_at, login_streak, last_active_date, member_number';
export const SHOW_COLUMNS = 'id, tenant_id, date, city, venue, country, region, ticket_url, status, sort_order, created_at, has_checkin';
