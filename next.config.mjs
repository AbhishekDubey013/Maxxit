/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    NEON_REST_URL: process.env.NEON_REST_URL,
  },
  webpack: (config) => {
    const path = await import('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(process.cwd(), 'client/src'),
      '@components': path.resolve(process.cwd(), 'components'),
      '@lib': path.resolve(process.cwd(), 'client/src/lib'),
      '@shared': path.resolve(process.cwd(), 'shared'),
    };
    return config;
  },
};

export default nextConfig;
