/** @type {import('next-sitemap').IConfig} */
const config = {
  siteUrl: getSiteUrl(),
  generateRobotsTxt: true,
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
  sitemapSize: 5000,
};

function getSiteUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const isProduction = process.env.NODE_ENV === 'production';
  const isCI = process.env.CI === 'true';

  // In production or CI, require an explicit base URL to prevent localhost URLs from being deployed
  if ((isProduction || isCI) && !baseUrl) {
    throw new Error(
      'NEXT_PUBLIC_BASE_URL environment variable is required in production and CI environments. ' +
        'This prevents localhost URLs from being indexed by search engines.'
    );
  }

  // Use the provided base URL or default to localhost for development
  return baseUrl || 'http://localhost:3000';
}

module.exports = config;
