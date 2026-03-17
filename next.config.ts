import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Flock Supabase Storage (project: pzcajxpqljulokvowcev)
      {
        protocol: 'https',
        hostname: 'pzcajxpqljulokvowcev.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Google OAuth profile avatars
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },

  // Needed for @supabase/ssr and other packages that use Node.js crypto
  // when running in the Edge Runtime (middleware).
  // Next.js 14 handles this automatically for middleware, but explicit is safer.
  experimental: {},
}

export default nextConfig
