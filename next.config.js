/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["localhost", "placeholder.com"],
    unoptimized: true,
  },
  experimental: {
    allowedDevOrigins: ['localhost', '127.0.0.1'],
  },
  serverExternalPackages: ["sharp"],
}

module.exports = nextConfig
