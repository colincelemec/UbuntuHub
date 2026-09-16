// ============================================
// Tests: image upload signature
// Cloudinary is not configured in tests → degraded mode.
// ============================================

jest.mock('@prisma/client', () => require('./helpers/mockPrisma').prismaClientMock);

const crypto = require('crypto');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { mockPrisma, resetMockPrisma } = require('./helpers/mockPrisma');
const { signParams } = require('../src/controllers/uploadController');

const user = {
  id: 'user_1', email: 'a@b.c', firstName: 'A', lastName: 'B',
  role: 'USER', avatar: null, isVerified: true,
};
const token = () => jwt.sign({ id: user.id }, process.env.JWT_SECRET);

beforeEach(() => {
  resetMockPrisma();
  mockPrisma.user.findUnique.mockResolvedValue(user);
});

describe('GET /api/uploads/status', () => {
  it('est public et indique si l\'envoi est disponible', async () => {
    const res = await request(app).get('/api/uploads/status');
    expect(res.status).toBe(200);
    expect(typeof res.body.configured).toBe('boolean');
  });

  it('signale « non configuré » sans identifiants Cloudinary', async () => {
    const res = await request(app).get('/api/uploads/status');
    expect(res.body.configured).toBe(false);
  });
});

describe('GET /api/uploads/signature', () => {
  it('refuse un visiteur non connecté (401)', async () => {
    const res = await request(app).get('/api/uploads/signature');
    expect(res.status).toBe(401);
  });

  it('répond 503 quand Cloudinary n\'est pas configuré', async () => {
    const res = await request(app)
      .get('/api/uploads/signature')
      .set('Authorization', `Bearer ${token()}`);

    expect(res.status).toBe(503);
    expect(res.body.configured).toBe(false);
  });

  it('ne divulgue jamais la clé secrète', async () => {
    const res = await request(app)
      .get('/api/uploads/signature')
      .set('Authorization', `Bearer ${token()}`);

    expect(JSON.stringify(res.body)).not.toMatch(/api_?secret/i);
  });
});

describe('Calcul de la signature', () => {
  // Matches the Cloudinary documentation: parameters sorted
  // alphabetically, concatenated, then SHA-1 with the secret.
  it('trie les paramètres par ordre alphabétique', () => {
    const secret = 'abcd';
    const params = { timestamp: 1315060510, public_id: 'sample_image' };
    const expected = crypto
      .createHash('sha1')
      .update('public_id=sample_image&timestamp=1315060510' + secret)
      .digest('hex');

    expect(signParams(params, secret)).toBe(expected);
  });

  it('produit une signature différente si un paramètre change', () => {
    const secret = 'abcd';
    const a = signParams({ folder: 'ubuntuhub/logos', timestamp: 1 }, secret);
    const b = signParams({ folder: 'ubuntuhub/covers', timestamp: 1 }, secret);
    expect(a).not.toBe(b);
  });

  it('produit une signature différente avec un autre secret', () => {
    const params = { folder: 'ubuntuhub/logos', timestamp: 1 };
    expect(signParams(params, 'secret-a')).not.toBe(signParams(params, 'secret-b'));
  });
});
