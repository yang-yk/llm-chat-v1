/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // 在Docker容器中，使用宿主机网络IP访问后端
    // Docker Desktop 使用 host.docker.internal
    // Linux 使用宿主机的实际IP
    const backendUrl = process.env.BACKEND_URL || 'http://172.17.0.1:8000';

    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ]
  },
  // 禁用开发工具面板（可选）
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
}

module.exports = nextConfig
