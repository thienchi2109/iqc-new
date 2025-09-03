/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['i.postimg.cc'],
  },
  // App Router is now stable in Next.js 15, no experimental flag needed
  
  // Fix Watchpack errors on Windows by ignoring system files
  webpack: (config, { isServer }) => {
    // Apply to both server and client
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        '**/DumpStack.log.tmp',
        '**/pagefile.sys',
        '**/System Volume Information/**',
        '**/hiberfil.sys',
        '**/swapfile.sys'
      ]
    }
    return config
  },
  
  // Additional option to reduce file watching errors
  typescript: {
    ignoreBuildErrors: false,
  }
}

module.exports = nextConfig
