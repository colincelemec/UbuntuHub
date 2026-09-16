// ============================================
// Tests: /api/reviews — reviews
// ============================================

jest.mock('@prisma/client', () => require('./helpers/mockPrisma').prismaClientMock);

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { mockPrisma, resetMockPrisma } = require('./helpers/mockPrisma');

const authUser = {
  id: 'user_1',
  email: 'test@example.com',
  firstName: 'Mario',
  lastName: 'Rossi',
  role: 'USER',
  avatar: null,
  isVerified: true,
};

const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

const sampleReview = {
  id: 'rev_1',
  businessId: 'biz_1',
  userId: 'user_1',
  rating: 5,
  comment: 'Esperienza fantastica, cibo ottimo!',
  isVisible: true,
  createdAt: new Date().toISOString(),
  user: { id: 'user_1', firstName: 'Mario', lastName: 'Rossi', avatar: null },
};

beforeEach(() => resetMockPrisma());

describe('GET /api/reviews/:businessId', () => {
  it('renvoie les avis visibles d\'une activité (200)', async () => {
    mockPrisma.review.count.mockResolvedValue(1);
    mockPrisma.review.findMany.mockResolvedValue([sampleReview]);

    const res = await request(app).get('/api/reviews/biz_1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockPrisma.review.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: 'biz_1', isVisible: true }),
      })
    );
  });
});

describe('POST /api/reviews', () => {
  it('refuse sans authentification (401)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ businessId: 'biz_1', rating: 5, comment: 'Ottimo posto, consigliato!' });

    expect(res.status).toBe(401);
  });

  it('refuse une note invalide (validation 400)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(authUser); // for protect()

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(authUser.id)}`)
      .send({ businessId: 'biz_1', rating: 9, comment: 'Nota impossibile!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // Regression: validation required a UUID while Prisma generates cuid
  // values. Every review submission therefore failed with "invalid
  // business ID", whatever the form contained.
  it('accepte un businessId au format cuid', async () => {
    const cuid = 'cmf3x8k2p0000qw3h5n8t2y1a';
    mockPrisma.user.findUnique.mockResolvedValue(authUser);
    mockPrisma.business.findUnique.mockResolvedValue({ id: cuid, name: 'Teranga' });
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.findFirst.mockResolvedValue(null);
    mockPrisma.review.create.mockResolvedValue({ id: 'rev_1', rating: 5 });
    mockPrisma.review.findMany.mockResolvedValue([{ rating: 5 }]);
    mockPrisma.business.update.mockResolvedValue({});

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(authUser.id)}`)
      .send({ businessId: cuid, rating: 5, comment: 'Bellissimo ristorante e pulito' });

    // Validation must no longer reject the identifier format
    const failedFields = (res.body.errors || []).map(e => e.path || e.param);
    expect(failedFields).not.toContain('businessId');
    expect(res.status).not.toBe(400);
  });

  it('refuse un businessId vide (400)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(authUser);

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${tokenFor(authUser.id)}`)
      .send({ businessId: '', rating: 5, comment: 'Test' });

    expect(res.status).toBe(400);
    expect((res.body.errors || []).map(e => e.path || e.param)).toContain('businessId');
  });

  it('refuse un token invalide (401)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', 'Bearer token-bidon')
      .send({ businessId: 'biz_1', rating: 5, comment: 'Ottimo posto!' });

    expect(res.status).toBe(401);
  });
});
