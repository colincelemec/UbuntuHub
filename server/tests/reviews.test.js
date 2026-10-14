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

// ============================================
// Editing and deleting your own review.
// The rule is not the same for the two: only the author may edit,
// while the author OR an admin may delete.
// ============================================

describe('PUT /api/reviews/:id', () => {
  const putReview = (body, userId = authUser.id) =>
    request(app)
      .put('/api/reviews/rev_1')
      .set('Authorization', `Bearer ${tokenFor(userId)}`)
      .send(body);

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(authUser);
    mockPrisma.review.findUnique.mockResolvedValue(sampleReview);
    mockPrisma.review.update.mockResolvedValue({ ...sampleReview, rating: 3, comment: 'Rivisto' });
    mockPrisma.review.findMany.mockResolvedValue([{ rating: 3 }]);
    mockPrisma.business.update.mockResolvedValue({});
  });

  it('aggiorna il voto e il commento (200)', async () => {
    const res = await putReview({ rating: 3, comment: 'Rivisto' });

    expect(res.status).toBe(200);
    expect(mockPrisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'rev_1' } })
    );
  });

  it('ricalcola la media dell\'attività quando il voto cambia', async () => {
    await putReview({ rating: 3, comment: 'Rivisto' });

    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ averageRating: 3 }),
      })
    );
  });

  it('impedisce di modificare la recensione di un altro (403)', async () => {
    const intruder = { ...authUser, id: 'user_2' };
    mockPrisma.user.findUnique.mockResolvedValue(intruder);

    const res = await putReview({ rating: 1, comment: 'Non mia' }, 'user_2');

    expect(res.status).toBe(403);
    expect(mockPrisma.review.update).not.toHaveBeenCalled();
  });

  it('rifiuta senza autenticazione (401)', async () => {
    const res = await request(app)
      .put('/api/reviews/rev_1')
      .send({ rating: 3, comment: 'Rivisto' });

    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/reviews/:id', () => {
  const deleteReview = (userId = authUser.id) =>
    request(app)
      .delete('/api/reviews/rev_1')
      .set('Authorization', `Bearer ${tokenFor(userId)}`);

  beforeEach(() => {
    mockPrisma.user.findUnique.mockResolvedValue(authUser);
    mockPrisma.review.findUnique.mockResolvedValue(sampleReview);
    mockPrisma.review.delete.mockResolvedValue(sampleReview);
    mockPrisma.review.findMany.mockResolvedValue([]);
    mockPrisma.business.update.mockResolvedValue({});
  });

  it('cancella la propria recensione (200)', async () => {
    const res = await deleteReview();

    expect(res.status).toBe(200);
    expect(mockPrisma.review.delete).toHaveBeenCalledWith({ where: { id: 'rev_1' } });
  });

  it('azzera le statistiche quando era l\'ultima recensione', async () => {
    await deleteReview();

    expect(mockPrisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ reviewCount: 0, averageRating: 0 }),
      })
    );
  });

  it('impedisce a un altro utente di cancellarla (403)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...authUser, id: 'user_2' });

    const res = await deleteReview('user_2');

    expect(res.status).toBe(403);
    expect(mockPrisma.review.delete).not.toHaveBeenCalled();
  });

  it('permette a un amministratore di cancellarla (200)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ ...authUser, id: 'admin_1', role: 'ADMIN' });

    const res = await deleteReview('admin_1');

    expect(res.status).toBe(200);
    expect(mockPrisma.review.delete).toHaveBeenCalled();
  });
});
