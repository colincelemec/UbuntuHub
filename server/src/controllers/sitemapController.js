// ============================================
// XML sitemap — generated from the database
// Lists the public pages: home, directory, cities and every
// published listing, so that search engines can find them.
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Public domain of the site (not the API one)
const SITE_URL = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')[0]
  .trim()
  .replace(/\/$/, '');

/** Escapes characters that are not allowed in XML */
const escapeXml = (str = '') =>
  str.replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));

const urlEntry = ({ loc, lastmod, changefreq, priority }) => `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `
    <lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;

/**
 * @route   GET /sitemap.xml
 * @access  Public
 */
exports.getSitemap = async (req, res) => {
  try {
    const [businesses, cities] = await Promise.all([
      prisma.business.findMany({
        // Every published listing, checked or not: they are public,
        // so they must be indexable.
        where: { status: 'VERIFIED' },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.city.findMany({
        where: { isActive: true },
        select: { slug: true },
      }),
    ]);

    const urls = [
      { loc: `${SITE_URL}/`, changefreq: 'weekly', priority: '1.0' },
      { loc: `${SITE_URL}/activities`, changefreq: 'daily', priority: '0.9' },
      { loc: `${SITE_URL}/register`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${SITE_URL}/login`, changefreq: 'monthly', priority: '0.3' },

      // Static pages
      ...['privacy', 'terms', 'cookies'].map(type => ({
        loc: `${SITE_URL}/legal/${type}`,
        changefreq: 'yearly',
        priority: '0.2',
      })),

      // Directory filtered by city: one landing page per city
      ...cities.map(c => ({
        loc: `${SITE_URL}/activities?city=${c.slug}`,
        changefreq: 'weekly',
        priority: '0.6',
      })),

      // Business detail pages
      ...businesses.map(b => ({
        loc: `${SITE_URL}/businesses/${b.slug}`,
        lastmod: b.updatedAt?.toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: '0.8',
      })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(urlEntry).join('\n')}
</urlset>`;

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // 1 heure
    res.send(xml);
  } catch (error) {
    console.error('Erreur getSitemap:', error);
    res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  }
};
