/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:8080'

const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_URL}/uploads/:path*`,
      },
    ]
  },
}

module.exports = nextConfig