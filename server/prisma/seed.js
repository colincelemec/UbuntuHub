// ============================================
// Database seed — reference data and demo accounts
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seed de la base de données...\n');

  // ============================================
  // 1. ITALIAN CITIES
  // ============================================
  console.log('📍 Création des villes...');

  // NB: slugs and names are Italian (canonical across the whole app).
  // The full list of the 107 provincial capitals lives in seeds/cities-italia.js.
  const cities = await Promise.all([
    prisma.city.upsert({
      where: { slug: 'milano' },
      update: {},
      create: {
        name: 'Milano',
        slug: 'milano',
        region: 'Lombardia',
        latitude: 45.4642,
        longitude: 9.1900,
        description: 'Capitale économique et mode de l\'Italie',
        order: 2
      }
    }),
    prisma.city.upsert({
      where: { slug: 'roma' },
      update: {},
      create: {
        name: 'Roma',
        slug: 'roma',
        region: 'Lazio',
        latitude: 41.9028,
        longitude: 12.4964,
        description: 'Capitale de l\'Italie, ville historique',
        order: 1
      }
    }),
    prisma.city.upsert({
      where: { slug: 'torino' },
      update: {},
      create: {
        name: 'Torino',
        slug: 'torino',
        region: 'Piemonte',
        latitude: 45.0703,
        longitude: 7.6869,
        description: 'Ville industrielle et culturelle',
        order: 4
      }
    }),
    prisma.city.upsert({
      where: { slug: 'firenze' },
      update: {},
      create: {
        name: 'Firenze',
        slug: 'firenze',
        region: 'Toscana',
        latitude: 43.7696,
        longitude: 11.2558,
        description: 'Berceau de la Renaissance',
        order: 8
      }
    }),
    prisma.city.upsert({
      where: { slug: 'bologna' },
      update: {},
      create: {
        name: 'Bologna',
        slug: 'bologna',
        region: 'Emilia-Romagna',
        latitude: 44.4949,
        longitude: 11.3426,
        description: 'Ville universitaire et gastronomique',
        order: 7
      }
    })
  ]);

  console.log(`✅ ${cities.length} villes créées\n`);

  // ============================================
  // 2. CATEGORIES
  // ============================================
  console.log('🏷️  Création des catégories...');

  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'restaurant' },
      update: {},
      create: {
        name: 'Restaurant',
        slug: 'restaurant',
        icon: '🍽️',
        color: '#EF4444',
        order: 1
      }
    }),
    prisma.category.upsert({
      where: { slug: 'coiffeur' },
      update: {},
      create: {
        name: 'Coiffeur / Barbier',
        slug: 'coiffeur',
        icon: '💇',
        color: '#8B5CF6',
        order: 2
      }
    }),
    prisma.category.upsert({
      where: { slug: 'epicerie' },
      update: {},
      create: {
        name: 'Épicerie Africaine',
        slug: 'epicerie',
        icon: '🛒',
        color: '#10B981',
        order: 3
      }
    }),
    prisma.category.upsert({
      where: { slug: 'mode' },
      update: {},
      create: {
        name: 'Mode & Vêtements',
        slug: 'mode',
        icon: '👗',
        color: '#F59E0B',
        order: 4
      }
    }),
    prisma.category.upsert({
      where: { slug: 'beaute' },
      update: {},
      create: {
        name: 'Beauté & Cosmétiques',
        slug: 'beaute',
        icon: '💄',
        color: '#EC4899',
        order: 5
      }
    }),
    prisma.category.upsert({
      where: { slug: 'service' },
      update: {},
      create: {
        name: 'Services',
        slug: 'service',
        icon: '🔧',
        color: '#6366F1',
        order: 6
      }
    })
  ]);

  console.log(`✅ ${categories.length} catégories créées\n`);

  // ============================================
  // 3. USERS
  // ============================================
  console.log('👥 Création des utilisateurs...');

  // ── Security ──
  // Demo accounts must NEVER exist in production with a known password.
  // We refuse to create them when NODE_ENV=production and no explicit
  // password was provided.
  const isProduction = process.env.NODE_ENV === 'production';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@ubuntuhub.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;

  if (isProduction && !adminPassword) {
    console.error('\n❌ En production, définissez SEED_ADMIN_PASSWORD avant de lancer le seed.');
    console.error('   Exemple : SEED_ADMIN_PASSWORD="…" npm run db:seed\n');
    process.exit(1);
  }

  const demoPassword = 'password123';
  const hashedPassword = await bcrypt.hash(demoPassword, 10);
  const hashedAdminPassword = adminPassword
    ? await bcrypt.hash(adminPassword, 10)
    : hashedPassword;

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: hashedAdminPassword,
      firstName: 'Admin',
      lastName: 'UbuntuHub',
      role: 'ADMIN',
      isVerified: true
    }
  });

  // ── Demo accounts: never in production ──
  if (!isProduction) {
    await prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        email: 'john@example.com',
        passwordHash: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        isVerified: true
      }
    });

    await prisma.user.upsert({
      where: { email: 'owner@example.com' },
      update: {},
      create: {
        email: 'owner@example.com',
        passwordHash: hashedPassword,
        firstName: 'Maria',
        lastName: 'Rossi',
        role: 'BUSINESS',
        isVerified: true
      }
    });

    console.log(`✅ 3 utilisateurs créés (démo — mot de passe: ${demoPassword})\n`);
    console.log(`   - ${adminEmail} (ADMIN)`);
    console.log('   - john@example.com (USER)');
    console.log('   - owner@example.com (BUSINESS)\n');
  } else {
    console.log(`✅ Compte administrateur créé : ${adminEmail}`);
    console.log('   (comptes de démonstration ignorés en production)\n');
  }

  // ============================================
  // 4. BUSINESSES
  // ============================================
  // No fictional businesses: every listing comes from the field census
  // (prisma/seeds/businesses-reali.js).
  // A directory built on trust cannot invent its own data.
  console.log('🏢 Attività: nessun dato di esempio.');
  console.log('   Caricale con: node prisma/seeds/businesses-reali.js\n');

  console.log('🎉 Seed terminé avec succès !\n');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
