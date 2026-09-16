// ============================================
// Tests: /api/businesses — the public directory
// ============================================

jest.mock('@prisma/client', () => require('./helpers/mockPrisma').prismaClientMock);

const request = require('supertest');
const app = require('../src/app');
const { mockPrisma, resetMockPrisma } = require('./helpers/mockPrisma');

const sampleBusiness = {
  id: 'biz_1',
  name: 'Ristorante Teranga',
  slug: 'ristorante-teranga',
  description: 'Cucina senegalese nel cuore di Milano',
  status: 'VERIFIED',
  isVerified: true,
  latitude: 45.46,
  longitude: 9.19,
  subscriptionTier: 'FREE',
  viewCount: 10,
  averageRating: 4.5,
  reviewCount: 12,
  city: { name: 'Milano', slug: 'milano' },
  category: { name: 'Ristorante', slug: 'restaurant', icon: null },
  owner: { firstName: 'Awa', lastName: 'Diop' },
};

beforeEach(() => resetMockPrisma());

describe('GET /api/businesses', () => {
  it('renvoie la liste paginée des activités (200)', async () => {
    mockPrisma.business.findMany.mockResolvedValue([sampleBusiness]);
    mockPrisma.business.count.mockResolvedValue(1);

    const res = await request(app).get('/api/businesses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].slug).toBe('ristorante-teranga');
    expect(res.body.pagination).toMatchObject({ page: 1, total: 1, totalPages: 1 });
  });

  it('applique les filtres ville et catégorie', async () => {
    mockPrisma.business.findMany.mockResolvedValue([]);
    mockPrisma.business.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/businesses')
      .query({ city: 'milano', category: 'restaurant' });

    expect(res.status).toBe(200);
    const whereArg = mockPrisma.business.findMany.mock.calls[0][0].where;
    expect(whereArg.city).toEqual({ slug: 'milano' });
    expect(whereArg.category).toEqual({ slug: 'restaurant' });
  });

  it('respecte la pagination (page/limit)', async () => {
    mockPrisma.business.findMany.mockResolvedValue([]);
    mockPrisma.business.count.mockResolvedValue(30);

    const res = await request(app)
      .get('/api/businesses')
      .query({ page: 2, limit: 10 });

    expect(res.status).toBe(200);
    const args = mockPrisma.business.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(res.body.pagination.totalPages).toBe(3);
  });
});

describe('GET /api/businesses/:slug', () => {
  it('renvoie le détail et incrémente le compteur de vues (200)', async () => {
    mockPrisma.business.findUnique.mockResolvedValue({ ...sampleBusiness, reviews: [] });
    mockPrisma.business.update.mockResolvedValue(sampleBusiness);

    const res = await request(app).get('/api/businesses/ristorante-teranga');

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Ristorante Teranga');
    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'biz_1' },
        data: { viewCount: { increment: 1 } },
      })
    );
  });

  it('renvoie 404 si introuvable', async () => {
    mockPrisma.business.findUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/businesses/inexistant');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/businesses', () => {
  it('refuse la création sans authentification (401)', async () => {
    const res = await request(app).post('/api/businesses').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  // Expected behaviour: a published business appears immediately in the
  // directory, including for visitors without an account.
  it('publie l\'activité immédiatement, sans badge de vérification', async () => {
    const jwt = require('jsonwebtoken');
    const user = {
      id: 'user_1', email: 'a@b.c', firstName: 'A', lastName: 'B',
      role: 'USER', avatar: null, isVerified: true,
    };
    mockPrisma.user.findUnique.mockResolvedValue(user);
    mockPrisma.city.findUnique.mockResolvedValue({ id: 'city_1', latitude: 45.4, longitude: 9.1 });
    mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat_1' });
    mockPrisma.business.findUnique.mockResolvedValue(null);
    mockPrisma.business.create.mockResolvedValue({ id: 'biz_new' });

    const res = await request(app)
      .post('/api/businesses')
      .set('Authorization', `Bearer ${jwt.sign({ id: user.id }, process.env.JWT_SECRET)}`)
      .send({
        name: 'PC Repair Modena',
        description: 'Riparazione computer e assistenza informatica a Modena.',
        cityId: 'city_1',
        categoryId: 'cat_1',
        address: 'Via Emilia 10',
      });

    expect(res.status).toBe(201);
    const created = mockPrisma.business.create.mock.calls[0][0].data;
    expect(created.status).toBe('VERIFIED');   // visible in the directory
    expect(created.isVerified).toBe(false);    // but no badge yet
  });
});

describe('Visibilité publique', () => {
  // Regression: the filter required isVerified, so any freshly published
  // business stayed invisible until an admin acted.
  it('n\'exige pas le badge de vérification pour être listée', async () => {
    mockPrisma.business.findMany.mockResolvedValue([]);
    mockPrisma.business.count.mockResolvedValue(0);

    await request(app).get('/api/businesses');

    const where = mockPrisma.business.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('VERIFIED');
    expect(where.isVerified).toBeUndefined();
  });

  it('n\'exige pas le badge dans la recherche', async () => {
    mockPrisma.business.findMany.mockResolvedValue([]);

    await request(app).get('/api/businesses/search').query({ q: 'repair' });

    const where = mockPrisma.business.findMany.mock.calls[0][0].where;
    expect(where.isVerified).toBeUndefined();
  });
});
