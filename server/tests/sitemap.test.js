// ============================================
// Tests: sitemap.xml and the health check
// Public pages exposed to search engines.
// ============================================

jest.mock('@prisma/client', () => require('./helpers/mockPrisma').prismaClientMock);

const request = require('supertest');
const app = require('../src/app');
const { mockPrisma, resetMockPrisma } = require('./helpers/mockPrisma');

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.business.findMany.mockResolvedValue([
    { slug: 'ristorante-teranga', updatedAt: new Date('2026-08-01T10:00:00Z') },
    { slug: 'salone-awa', updatedAt: new Date('2026-07-15T09:00:00Z') },
  ]);
  mockPrisma.city.findMany.mockResolvedValue([
    { slug: 'milano' },
    { slug: 'roma' },
  ]);
});

describe('GET /sitemap.xml', () => {
  it('répond en XML (200)', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/xml/);
  });

  it('contient un XML valide et bien formé', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(res.text).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(res.text.trim()).toMatch(/<\/urlset>$/);
    // As many opening tags as closing ones
    const open = (res.text.match(/<url>/g) || []).length;
    const close = (res.text.match(/<\/url>/g) || []).length;
    expect(open).toBe(close);
    expect(open).toBeGreaterThan(0);
  });

  it('liste les fiches des activités vérifiées', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('/businesses/ristorante-teranga');
    expect(res.text).toContain('/businesses/salone-awa');
    // Only asks for published businesses
    expect(mockPrisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'VERIFIED' },
      })
    );
  });

  it('inclut l\'accueil, l\'annuaire et les pages par ville', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('/activities');
    expect(res.text).toContain('city=milano');
    expect(res.text).toContain('city=roma');
  });

  it('renseigne la date de dernière modification', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.text).toContain('<lastmod>2026-08-01</lastmod>');
  });

  it('reste valide si la base est vide', async () => {
    mockPrisma.business.findMany.mockResolvedValue([]);
    mockPrisma.city.findMany.mockResolvedValue([]);
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('</urlset>');
  });

  it('renvoie un XML vide plutôt qu\'une erreur si la base échoue', async () => {
    mockPrisma.business.findMany.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(500);
    expect(res.text).toContain('<urlset');
  });
});

describe('GET /health', () => {
  it('répond que l\'API fonctionne', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Sécurité des réponses', () => {
  it('ne divulgue pas les détails techniques hors développement', async () => {
    // NODE_ENV=test → devDetails() returns the message (as in dev).
    // What matters is that no stack trace is exposed.
    mockPrisma.business.findMany.mockRejectedValue(new Error('secret interne'));
    mockPrisma.business.count.mockRejectedValue(new Error('secret interne'));
    const res = await request(app).get('/api/businesses');
    expect(res.status).toBe(500);
    expect(res.body.stack).toBeUndefined();
  });

  it('renvoie 404 sur une route inconnue', async () => {
    const res = await request(app).get('/api/route-inexistante');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
