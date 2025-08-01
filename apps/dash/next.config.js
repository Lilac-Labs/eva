/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
  },
  transpilePackages: ['@repo/db'],
}

module.exports = nextConfig