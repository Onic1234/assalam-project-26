/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "export", // Disable sementara agar rewrites berfungsi
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:40001/:path*',
      },
    ];
  },
  experimental: {
    allowedDevOrigins: ["assalam-canteen.loca.lt", "192.168.1.137:3001"],
  },
};

module.exports = nextConfig;
