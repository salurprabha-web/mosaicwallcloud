/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `https://mosaic-wall-backend.salurprabha.workers.dev/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `https://mosaic-wall-backend.salurprabha.workers.dev/uploads/:path*`,
      },
    ];
  },
};
export default nextConfig;
