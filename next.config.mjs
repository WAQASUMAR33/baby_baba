/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  // Turbopack configuration for Next.js 16
  turbopack: {},
  // Webpack configuration for compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Allow importing TypeScript files from JavaScript
      config.resolve.extensionAlias = {
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
      };
    }
    return config;
  },
  // Ensure environment variables are available
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'vAyWrNiJupbyfq7fGtNJsSRM3SwzHcKsu435xHL6yWA=',
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
    SHOPIFY_ACCESS_TOKEN: process.env.SHOPIFY_ACCESS_TOKEN,
    SHOPIFY_API_VERSION: process.env.SHOPIFY_API_VERSION || '2024-01',
  },
};

export default nextConfig;
