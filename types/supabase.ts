export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: { id: number; slug: string; name: string; custom_domain: string | null; created_at: string }
        Insert: { id?: number; slug: string; name: string; custom_domain?: string | null; created_at?: string }
        Update: { id?: number; slug?: string; name?: string; custom_domain?: string | null }
      }
      tenant_config: {
        Row: { id: number; tenant_id: number; key: string; value: string | null }
        Insert: { id?: number; tenant_id: number; key: string; value?: string | null }
        Update: { id?: number; tenant_id?: number; key?: string; value?: string | null }
      }
      tenant_members: {
        Row: { id: number; tenant_id: number; slug: string; name: string; accent_color: string; bio: string | null; avatar_url: string | null; display_order: number }
        Insert: { id?: number; tenant_id: number; slug: string; name: string; accent_color: string; bio?: string | null; avatar_url?: string | null; display_order?: number }
        Update: { id?: number; slug?: string; name?: string; accent_color?: string; bio?: string | null; avatar_url?: string | null; display_order?: number }
      }
      flock_accounts: {
        Row: { id: string; auth_user_id: string; full_name: string; email: string; tenant_id: number | null; created_at: string }
        Insert: { id?: string; auth_user_id: string; full_name: string; email: string; tenant_id?: number | null; created_at?: string }
        Update: { id?: string; full_name?: string; email?: string; tenant_id?: number | null }
      }
      profiles: {
        Row: { id: string; display_name: string | null; bio: string | null; city: string | null; avatar_url: string | null; role: string; band_member: string | null; stamp_count: number; stamp_level: string; show_count: number; referral_code: string | null; referral_count: number; email_notifications: boolean; tenant_id: number; created_at: string }
        Insert: { id: string; display_name?: string | null; bio?: string | null; city?: string | null; avatar_url?: string | null; role?: string; band_member?: string | null; stamp_count?: number; stamp_level?: string; show_count?: number; referral_code?: string | null; referral_count?: number; email_notifications?: boolean; tenant_id: number; created_at?: string }
        Update: { display_name?: string | null; bio?: string | null; city?: string | null; avatar_url?: string | null; role?: string; band_member?: string | null; stamp_count?: number; stamp_level?: string; show_count?: number; email_notifications?: boolean }
      }
      posts: {
        Row: { id: string; author_id: string; content: string; feed_type: string; image_url: string | null; images: Json | null; audio_url: string | null; is_exclusive: boolean; tenant_id: number; created_at: string }
        Insert: { id?: string; author_id: string; content: string; feed_type?: string; image_url?: string | null; images?: Json | null; audio_url?: string | null; is_exclusive?: boolean; tenant_id: number; created_at?: string }
        Update: { content?: string; feed_type?: string; image_url?: string | null; images?: Json | null; audio_url?: string | null; is_exclusive?: boolean }
      }
    }
    Views: Record<string, never>
    Functions: {
      set_tenant: {
        Args: { slug: string }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
  }
}
