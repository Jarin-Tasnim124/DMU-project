/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable automatic static page prefetching in Next.js Link tags
  // so that our empirical framework strictly measures our custom hover-intent vs baseline!
  experimental: {
    // Next.js experimental flags if needed
  }
};

module.exports = nextConfig;
