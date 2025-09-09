/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // App Router is now stable in Next.js 15, no experimental flag needed
  
  // Fix Watchpack errors on Windows by ignoring system files (dev only)
  webpack: (config, { dev }) => {
    if (dev) {
      const ignored = [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        // Windows system files (match anywhere)
        '**/DumpStack.log.tmp',
        '**/pagefile.sys',
        '**/hiberfil.sys',
        '**/swapfile.sys',
        // System folder
        '**/System Volume Information/**',
      ]

      config.watchOptions = {
        ...config.watchOptions,
        ignored: Array.isArray(config.watchOptions?.ignored)
          ? [...config.watchOptions.ignored, ...ignored]
          : ignored,
      }
    }
    return config
  },
  async redirects() {
    return [
      {
        source: '/lj-chart',
        destination: '/quick-entry',
        permanent: true, // 308
      },
    ]
  },
  
  // Additional option to reduce file watching errors
  typescript: {
    ignoreBuildErrors: false,
  }
}

module.exports = nextConfig
