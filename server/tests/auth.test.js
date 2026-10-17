// ============================================
// Tests: /api/auth — inscription et connexion
// ============================================

jest.mock('@prisma/client', () => require('./helpers/mockPrisma').prismaClientMock);

// Google ID token verification is stubbed: no network call to Google
jest.mock('google-auth-library', () => {
  const verifyIdToken = jest.fn();
  return {
    OAuth2Client: jest.fn(() => ({ verifyIdToken })),
    __verifyIdToken: verifyIdToken,
  };
});

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { mockPrisma, resetMockPrisma } = require('./helpers/mockPrisma');

const validUser = {
  email: 'test@example.com',
  password: 'Password123',
  firstName: 'Mario',
  lastName: 'Rossi',
};

const dbUser = {
  id: 'user_1',
  email: validUser.email,
  firstName: 'Mario',
  lastName: 'Rossi',
  phone: null,
  role: 'USER',
  avatar: null,
  isVerified: false,
  createdAt: new Date().toISOString(),
};

beforeEach(() => resetMockPrisma());

describe('POST /api/auth/register', () => {
  it('crée un utilisateur et renvoie un token (201)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue(dbUser);

    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.token).toBeDefined();
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });

  it('refuse un email déjà utilisé (400)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(dbUser);

    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('refuse un email invalide (validation 400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('refuse un mot de passe trop court (validation 400)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('connecte un utilisateur avec les bons identifiants (200)', async () => {
    const passwordHash = await bcrypt.hash(validUser.password, 10);
    mockPrisma.user.findUnique.mockResolvedValue({ ...dbUser, passwordHash });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('refuse un mauvais mot de passe (401)', async () => {
    const passwordHash = await bcrypt.hash('AutrePassword1', 10);
    mockPrisma.user.findUnique.mockResolvedValue({ ...dbUser, passwordHash });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('refuse un utilisateur inconnu (401)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inconnu@example.com', password: 'Password123' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('refuse sans token (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ============================================
// POST /api/auth/google — ID token verification
// ============================================

describe('POST /api/auth/google', () => {
  const { __verifyIdToken: verifyIdToken } = require('google-auth-library');

  const googlePayload = (overrides = {}) => ({
    sub: 'google-sub-123',
    email: 'mario@gmail.com',
    email_verified: true,
    given_name: 'Mario',
    family_name: 'Rossi',
    picture: 'https://example.com/a.png',
    ...overrides,
  });

  const ticketFor = (payload) => ({ getPayload: () => payload });

  beforeEach(() => verifyIdToken.mockReset());

  it('rifiuta la richiesta senza ID token (400)', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("verifica il token indicando il client ID di UbuntuHub come audience", async () => {
    verifyIdToken.mockResolvedValue(ticketFor(googlePayload()));
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'u_g', email: 'mario@gmail.com' });

    await request(app).post('/api/auth/google').send({ idToken: 'tok' });

    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'tok',
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  });

  it("rifiuta un token emesso per un'altra applicazione (401) senza toccare il database", async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));

    const res = await request(app).post('/api/auth/google').send({ idToken: 'tok-altra-app' });

    expect(res.status).toBe(401);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("non collega un account esistente se l'email non è verificata da Google (401)", async () => {
    verifyIdToken.mockResolvedValue(ticketFor(googlePayload({ email_verified: false })));

    const res = await request(app).post('/api/auth/google').send({ idToken: 'tok' });

    expect(res.status).toBe(401);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("collega l'account esistente con la stessa email verificata (200)", async () => {
    verifyIdToken.mockResolvedValue(ticketFor(googlePayload()));
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null) // nessun utente con questo googleId
      .mockResolvedValueOnce({ id: 'user_1', email: 'mario@gmail.com', googleId: null, avatar: null });
    mockPrisma.user.update.mockResolvedValue({ id: 'user_1', email: 'mario@gmail.com', googleId: 'google-sub-123' });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'tok' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user_1' } })
    );
  });

  it("rifiuta un'email già collegata a un altro account Google (409)", async () => {
    verifyIdToken.mockResolvedValue(ticketFor(googlePayload()));
    mockPrisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user_1', email: 'mario@gmail.com', googleId: 'altro-sub' });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'tok' });

    expect(res.status).toBe(409);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it('crea un nuovo utente al primo accesso (200)', async () => {
    verifyIdToken.mockResolvedValue(ticketFor(googlePayload()));
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: 'u_new', email: 'mario@gmail.com' });

    const res = await request(app).post('/api/auth/google').send({ idToken: 'tok' });

    expect(res.status).toBe(200);
    expect(mockPrisma.user.create).toHaveBeenCalled();
  });
});
