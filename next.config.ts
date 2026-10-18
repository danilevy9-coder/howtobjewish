import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  async redirects() {
    return [
      // Placeholder pages merged into the full guide on the same topic
      { source: '/jewish-mourning-and-shiva/', destination: '/jewish-mourning-and-shiva-2/', statusCode: 301 },
      { source: '/jewish-clothing-and-modesty/', destination: '/jewish-clothing-and-modesty-2/', statusCode: 301 },
      { source: '/what-is-a-synagogue/', destination: '/what-is-a-synagogue-2/', statusCode: 301 },
      { source: '/bar-and-bat-mitzvah-guide/', destination: '/bar-and-bat-mitzvah-guide-2/', statusCode: 301 },
      { source: '/jewish-wedding-traditions-3/', destination: '/jewish-wedding-traditions/', statusCode: 301 },
      // Addresses without the -2 suffix (linked from the menu and footer) go to the guide
      { source: '/how-to-start-keeping-kosher-a-beginners-guide/', destination: '/how-to-start-keeping-kosher-a-beginners-guide-2/', statusCode: 301 },
      { source: '/overview-of-the-jewish-holiday-cycle/', destination: '/overview-of-the-jewish-holiday-cycle-2/', statusCode: 301 },
      { source: '/what-is-shabbat-and-why-do-jews-keep-it/', destination: '/what-is-shabbat-and-why-do-jews-keep-it-2/', statusCode: 301 },
      { source: '/understanding-jewish-music-and-art/', destination: '/understanding-jewish-music-and-art-2/', statusCode: 301 },
      { source: '/finding-a-mentor-or-rabbi/', destination: '/finding-a-mentor-or-rabbi-2/', statusCode: 301 },
      { source: '/honesty-and-business-ethics/', destination: '/honesty-and-business-ethics-2/', statusCode: 301 },
      { source: '/charity-tzedakah-in-jewish-life/', destination: '/charity-tzedakah-in-jewish-life-2/', statusCode: 301 },
      { source: '/hamantaschen-vs-oznay-haman-history-recipe/', destination: '/hamantaschen-vs-oznay-haman-history-recipe-2/', statusCode: 301 },
      { source: '/how-to-kasher-your-oven-for-passover/', destination: '/how-to-kasher-your-oven-for-passover-2/', statusCode: 301 },
      { source: '/selling-chametz-how-does-it-work/', destination: '/selling-chametz-how-does-it-work-2/', statusCode: 301 },
      { source: '/building-a-jewish-home/', destination: '/building-a-jewish-home-2/', statusCode: 301 },
      { source: '/where-to-begin-your-jewish-journey/', destination: '/where-to-begin-your-jewish-journey-2/', statusCode: 301 },
    ]
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' }],
      },
    ]
  },
};

export default nextConfig;
