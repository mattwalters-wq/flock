/** @type {import('next').NextConfig} */
const nextConfig = {
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
}

export default nextConfig
