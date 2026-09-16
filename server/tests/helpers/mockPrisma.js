// ============================================
// Prisma mock — shared by every test suite.
// Tests run without a database: Prisma queries are jest.fn()
// stubs, configured per scenario.
// ============================================

const modelMethods = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

const mockPrisma = {
  user: modelMethods(),
  business: modelMethods(),
  review: modelMethods(),
  city: modelMethods(),
  category: modelMethods(),
  favorite: modelMethods(),
  $transaction: jest.fn((ops) => Promise.all(ops)),
  $disconnect: jest.fn(),
};

// Reset every mock between tests
const resetMockPrisma = () => {
  for (const model of Object.values(mockPrisma)) {
    if (typeof model === 'object') {
      for (const fn of Object.values(model)) {
        if (jest.isMockFunction(fn)) fn.mockReset();
      }
    }
  }
  mockPrisma.$transaction.mockImplementation((ops) => Promise.all(ops));
};

// Factory used by jest.mock('@prisma/client')
const prismaClientMock = {
  PrismaClient: jest.fn(() => mockPrisma),
};

module.exports = { mockPrisma, resetMockPrisma, prismaClientMock };
