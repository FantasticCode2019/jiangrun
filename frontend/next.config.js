/** @type {import('next').NextConfig} */
const API_URL = process.env.API_URL || 'http://localhost:8080'

const nextConfig = {
  // 开发脚本不自动生成仓库级 AI 说明文件，保持工作区干净。
  agentRules: false,
  output: 'standalone',
	outputFileTracingRoot: __dirname,
  images: {
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
