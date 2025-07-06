/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
  },
  // Optimize for Vercel deployment
  typescript: {
    // Type checking is handled by separate CI step
    ignoreBuildErrors: false,
  },
  eslint: {
    // ESLint checking is handled by separate CI step
    ignoreDuringBuilds: false,
  },
  // Output configuration for better performance
  output: 'standalone',
  // Image optimization
  images: {
    domains: ['localhost'],
  },
}

module.exports = nextConfig