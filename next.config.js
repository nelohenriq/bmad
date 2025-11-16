/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Performance optimizations
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        // Separate vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        // Separate UI components
        ui: {
          test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
          name: 'ui-components',
          chunks: 'all',
          priority: 20,
        },
      }
    }

    return config
  },
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
  },
}

module.exports = nextConfig
