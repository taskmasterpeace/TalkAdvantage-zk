/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ["localhost", "placeholder.com"],
    unoptimized: true,
  },
  experimental: {
    // Skip static generation for dashboard pages
    skipTrailingSlashRedirect: true,
    serverComponentsExternalPackages: ["sharp"],
  },
  // Skip static generation for dashboard pages
  unstable_excludeFiles: ["**/app/dashboard/**/*"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
