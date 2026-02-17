// next.config.js

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: false,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://laughing-lamp-4jvj9rj664w6f74vv-5000.app.github.dev/',
  },
};

module.exports = nextConfig;