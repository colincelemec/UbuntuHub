// ============================================
// Italian cities — the 107 provincial capitals
// Complete coverage of the national territory.
// Italian slugs (matching the frontend filters).
// Coordinates: city centre (WGS84).
//
// Run with: node prisma/seeds/cities-italia.js
// Idempotent: upserts on the slug, never duplicates anything.
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// order: 1-16 = major cities (shown first), then alphabetical (order 50)
const CITIES = [
  // ── Major cities (highlighted) ──
  { slug: 'roma',      name: 'Roma',      region: 'Lazio',                 latitude: 41.9028, longitude: 12.4964, order: 1 },
  { slug: 'milano',    name: 'Milano',    region: 'Lombardia',             latitude: 45.4642, longitude: 9.1900,  order: 2 },
  { slug: 'napoli',    name: 'Napoli',    region: 'Campania',              latitude: 40.8518, longitude: 14.2681, order: 3 },
  { slug: 'torino',    name: 'Torino',    region: 'Piemonte',              latitude: 45.0703, longitude: 7.6869,  order: 4 },
  { slug: 'palermo',   name: 'Palermo',   region: 'Sicilia',               latitude: 38.1157, longitude: 13.3615, order: 5 },
  { slug: 'genova',    name: 'Genova',    region: 'Liguria',               latitude: 44.4056, longitude: 8.9463,  order: 6 },
  { slug: 'bologna',   name: 'Bologna',   region: 'Emilia-Romagna',        latitude: 44.4949, longitude: 11.3426, order: 7 },
  { slug: 'firenze',   name: 'Firenze',   region: 'Toscana',               latitude: 43.7696, longitude: 11.2558, order: 8 },
  { slug: 'bari',      name: 'Bari',      region: 'Puglia',                latitude: 41.1171, longitude: 16.8719, order: 9 },
  { slug: 'catania',   name: 'Catania',   region: 'Sicilia',               latitude: 37.5079, longitude: 15.0830, order: 10 },
  { slug: 'venezia',   name: 'Venezia',   region: 'Veneto',                latitude: 45.4408, longitude: 12.3155, order: 11 },
  { slug: 'verona',    name: 'Verona',    region: 'Veneto',                latitude: 45.4384, longitude: 10.9916, order: 12 },
  { slug: 'padova',    name: 'Padova',    region: 'Veneto',                latitude: 45.4064, longitude: 11.8768, order: 13 },
  { slug: 'bergamo',   name: 'Bergamo',   region: 'Lombardia',             latitude: 45.6983, longitude: 9.6773,  order: 14 },
  { slug: 'parma',     name: 'Parma',     region: 'Emilia-Romagna',        latitude: 44.8015, longitude: 10.3279, order: 15 },
  { slug: 'cagliari',  name: 'Cagliari',  region: 'Sardegna',              latitude: 39.2238, longitude: 9.1217,  order: 16 },

  // ── Abruzzo ──
  { slug: 'chieti',        name: 'Chieti',        region: 'Abruzzo', latitude: 42.3512, longitude: 14.1680, order: 50 },
  { slug: 'laquila',       name: "L'Aquila",      region: 'Abruzzo', latitude: 42.3498, longitude: 13.3995, order: 50 },
  { slug: 'pescara',       name: 'Pescara',       region: 'Abruzzo', latitude: 42.4643, longitude: 14.2142, order: 50 },
  { slug: 'teramo',        name: 'Teramo',        region: 'Abruzzo', latitude: 42.6589, longitude: 13.7042, order: 50 },

  // ── Basilicata ──
  { slug: 'matera',        name: 'Matera',        region: 'Basilicata', latitude: 40.6664, longitude: 16.6043, order: 50 },
  { slug: 'potenza',       name: 'Potenza',       region: 'Basilicata', latitude: 40.6395, longitude: 15.8054, order: 50 },

  // ── Calabria ──
  { slug: 'catanzaro',     name: 'Catanzaro',     region: 'Calabria', latitude: 38.9098, longitude: 16.5877, order: 50 },
  { slug: 'cosenza',       name: 'Cosenza',       region: 'Calabria', latitude: 39.2983, longitude: 16.2536, order: 50 },
  { slug: 'crotone',       name: 'Crotone',       region: 'Calabria', latitude: 39.0808, longitude: 17.1270, order: 50 },
  { slug: 'reggio-calabria', name: 'Reggio Calabria', region: 'Calabria', latitude: 38.1113, longitude: 15.6473, order: 50 },
  { slug: 'vibo-valentia', name: 'Vibo Valentia', region: 'Calabria', latitude: 38.6759, longitude: 16.1010, order: 50 },

  // ── Campania ──
  { slug: 'avellino',      name: 'Avellino',      region: 'Campania', latitude: 40.9146, longitude: 14.7903, order: 50 },
  { slug: 'benevento',     name: 'Benevento',     region: 'Campania', latitude: 41.1298, longitude: 14.7826, order: 50 },
  { slug: 'caserta',       name: 'Caserta',       region: 'Campania', latitude: 41.0722, longitude: 14.3329, order: 50 },
  { slug: 'salerno',       name: 'Salerno',       region: 'Campania', latitude: 40.6824, longitude: 14.7681, order: 50 },

  // ── Emilia-Romagna ──
  { slug: 'ferrara',       name: 'Ferrara',       region: 'Emilia-Romagna', latitude: 44.8378, longitude: 11.6196, order: 50 },
  { slug: 'forli-cesena',  name: 'Forlì-Cesena',  region: 'Emilia-Romagna', latitude: 44.2226, longitude: 12.0401, order: 50 },
  { slug: 'modena',        name: 'Modena',        region: 'Emilia-Romagna', latitude: 44.6471, longitude: 10.9252, order: 50 },
  { slug: 'piacenza',      name: 'Piacenza',      region: 'Emilia-Romagna', latitude: 45.0526, longitude: 9.6930,  order: 50 },
  { slug: 'ravenna',       name: 'Ravenna',       region: 'Emilia-Romagna', latitude: 44.4184, longitude: 12.2035, order: 50 },
  { slug: 'reggio-emilia', name: 'Reggio Emilia', region: 'Emilia-Romagna', latitude: 44.6983, longitude: 10.6297, order: 50 },
  { slug: 'rimini',        name: 'Rimini',        region: 'Emilia-Romagna', latitude: 44.0678, longitude: 12.5695, order: 50 },

  // ── Friuli-Venezia Giulia ──
  { slug: 'gorizia',       name: 'Gorizia',       region: 'Friuli-Venezia Giulia', latitude: 45.9401, longitude: 13.6222, order: 50 },
  { slug: 'pordenone',     name: 'Pordenone',     region: 'Friuli-Venezia Giulia', latitude: 45.9564, longitude: 12.6605, order: 50 },
  { slug: 'trieste',       name: 'Trieste',       region: 'Friuli-Venezia Giulia', latitude: 45.6495, longitude: 13.7768, order: 50 },
  { slug: 'udine',         name: 'Udine',         region: 'Friuli-Venezia Giulia', latitude: 46.0711, longitude: 13.2346, order: 50 },

  // ── Lazio ──
  { slug: 'frosinone',     name: 'Frosinone',     region: 'Lazio', latitude: 41.6396, longitude: 13.3418, order: 50 },
  { slug: 'latina',        name: 'Latina',        region: 'Lazio', latitude: 41.4676, longitude: 12.9037, order: 50 },
  { slug: 'rieti',         name: 'Rieti',         region: 'Lazio', latitude: 42.4043, longitude: 12.8567, order: 50 },
  { slug: 'viterbo',       name: 'Viterbo',       region: 'Lazio', latitude: 42.4207, longitude: 12.1077, order: 50 },

  // ── Liguria ──
  { slug: 'imperia',       name: 'Imperia',       region: 'Liguria', latitude: 43.8857, longitude: 8.0276, order: 50 },
  { slug: 'la-spezia',     name: 'La Spezia',     region: 'Liguria', latitude: 44.1025, longitude: 9.8241, order: 50 },
  { slug: 'savona',        name: 'Savona',        region: 'Liguria', latitude: 44.3091, longitude: 8.4772, order: 50 },

  // ── Lombardia ──
  { slug: 'brescia',       name: 'Brescia',       region: 'Lombardia', latitude: 45.5416, longitude: 10.2118, order: 50 },
  { slug: 'como',          name: 'Como',          region: 'Lombardia', latitude: 45.8081, longitude: 9.0852,  order: 50 },
  { slug: 'cremona',       name: 'Cremona',       region: 'Lombardia', latitude: 45.1332, longitude: 10.0227, order: 50 },
  { slug: 'lecco',         name: 'Lecco',         region: 'Lombardia', latitude: 45.8566, longitude: 9.3977,  order: 50 },
  { slug: 'lodi',          name: 'Lodi',          region: 'Lombardia', latitude: 45.3142, longitude: 9.5033,  order: 50 },
  { slug: 'mantova',       name: 'Mantova',       region: 'Lombardia', latitude: 45.1564, longitude: 10.7914, order: 50 },
  { slug: 'monza',         name: 'Monza',         region: 'Lombardia', latitude: 45.5845, longitude: 9.2744,  order: 50 },
  { slug: 'pavia',         name: 'Pavia',         region: 'Lombardia', latitude: 45.1847, longitude: 9.1582,  order: 50 },
  { slug: 'sondrio',       name: 'Sondrio',       region: 'Lombardia', latitude: 46.1699, longitude: 9.8721,  order: 50 },
  { slug: 'varese',        name: 'Varese',        region: 'Lombardia', latitude: 45.8206, longitude: 8.8251,  order: 50 },

  // ── Marche ──
  { slug: 'ancona',        name: 'Ancona',        region: 'Marche', latitude: 43.6158, longitude: 13.5189, order: 50 },
  { slug: 'ascoli-piceno', name: 'Ascoli Piceno', region: 'Marche', latitude: 42.8537, longitude: 13.5749, order: 50 },
  { slug: 'fermo',         name: 'Fermo',         region: 'Marche', latitude: 43.1608, longitude: 13.7180, order: 50 },
  { slug: 'macerata',      name: 'Macerata',      region: 'Marche', latitude: 43.2999, longitude: 13.4534, order: 50 },
  { slug: 'pesaro-urbino', name: 'Pesaro e Urbino', region: 'Marche', latitude: 43.9102, longitude: 12.9132, order: 50 },

  // ── Molise ──
  { slug: 'campobasso',    name: 'Campobasso',    region: 'Molise', latitude: 41.5603, longitude: 14.6627, order: 50 },
  { slug: 'isernia',       name: 'Isernia',       region: 'Molise', latitude: 41.5946, longitude: 14.2306, order: 50 },

  // ── Piemonte ──
  { slug: 'alessandria',   name: 'Alessandria',   region: 'Piemonte', latitude: 44.9133, longitude: 8.6153, order: 50 },
  { slug: 'asti',          name: 'Asti',          region: 'Piemonte', latitude: 44.9009, longitude: 8.2065, order: 50 },
  { slug: 'biella',        name: 'Biella',        region: 'Piemonte', latitude: 45.5628, longitude: 8.0583, order: 50 },
  { slug: 'cuneo',         name: 'Cuneo',         region: 'Piemonte', latitude: 44.3841, longitude: 7.5426, order: 50 },
  { slug: 'novara',        name: 'Novara',        region: 'Piemonte', latitude: 45.4469, longitude: 8.6216, order: 50 },
  { slug: 'verbania',      name: 'Verbania',      region: 'Piemonte', latitude: 45.9214, longitude: 8.5514, order: 50 },
  { slug: 'vercelli',      name: 'Vercelli',      region: 'Piemonte', latitude: 45.3206, longitude: 8.4231, order: 50 },

  // ── Puglia ──
  { slug: 'barletta-andria-trani', name: 'Barletta-Andria-Trani', region: 'Puglia', latitude: 41.2270, longitude: 16.2951, order: 50 },
  { slug: 'brindisi',      name: 'Brindisi',      region: 'Puglia', latitude: 40.6327, longitude: 17.9360, order: 50 },
  { slug: 'foggia',        name: 'Foggia',        region: 'Puglia', latitude: 41.4622, longitude: 15.5446, order: 50 },
  { slug: 'lecce',         name: 'Lecce',         region: 'Puglia', latitude: 40.3515, longitude: 18.1750, order: 50 },
  { slug: 'taranto',       name: 'Taranto',       region: 'Puglia', latitude: 40.4644, longitude: 17.2470, order: 50 },

  // ── Sardegna ──
  { slug: 'nuoro',         name: 'Nuoro',         region: 'Sardegna', latitude: 40.3210, longitude: 9.3298, order: 50 },
  { slug: 'oristano',      name: 'Oristano',      region: 'Sardegna', latitude: 39.9062, longitude: 8.5880, order: 50 },
  { slug: 'sassari',       name: 'Sassari',       region: 'Sardegna', latitude: 40.7259, longitude: 8.5557, order: 50 },
  { slug: 'sud-sardegna',  name: 'Sud Sardegna',  region: 'Sardegna', latitude: 39.3086, longitude: 8.7997, order: 50 },

  // ── Sicilia ──
  { slug: 'agrigento',     name: 'Agrigento',     region: 'Sicilia', latitude: 37.3110, longitude: 13.5765, order: 50 },
  { slug: 'caltanissetta', name: 'Caltanissetta', region: 'Sicilia', latitude: 37.4863, longitude: 14.0625, order: 50 },
  { slug: 'enna',          name: 'Enna',          region: 'Sicilia', latitude: 37.5668, longitude: 14.2795, order: 50 },
  { slug: 'messina',       name: 'Messina',       region: 'Sicilia', latitude: 38.1938, longitude: 15.5540, order: 50 },
  { slug: 'ragusa',        name: 'Ragusa',        region: 'Sicilia', latitude: 36.9250, longitude: 14.7302, order: 50 },
  { slug: 'siracusa',      name: 'Siracusa',      region: 'Sicilia', latitude: 37.0755, longitude: 15.2866, order: 50 },
  { slug: 'trapani',       name: 'Trapani',       region: 'Sicilia', latitude: 38.0176, longitude: 12.5365, order: 50 },

  // ── Toscana ──
  { slug: 'arezzo',        name: 'Arezzo',        region: 'Toscana', latitude: 43.4633, longitude: 11.8796, order: 50 },
  { slug: 'grosseto',      name: 'Grosseto',      region: 'Toscana', latitude: 42.7635, longitude: 11.1128, order: 50 },
  { slug: 'livorno',       name: 'Livorno',       region: 'Toscana', latitude: 43.5485, longitude: 10.3106, order: 50 },
  { slug: 'lucca',         name: 'Lucca',         region: 'Toscana', latitude: 43.8430, longitude: 10.5079, order: 50 },
  { slug: 'massa-carrara', name: 'Massa-Carrara', region: 'Toscana', latitude: 44.0367, longitude: 10.1409, order: 50 },
  { slug: 'pisa',          name: 'Pisa',          region: 'Toscana', latitude: 43.7160, longitude: 10.3966, order: 50 },
  { slug: 'pistoia',       name: 'Pistoia',       region: 'Toscana', latitude: 43.9330, longitude: 10.9179, order: 50 },
  { slug: 'prato',         name: 'Prato',         region: 'Toscana', latitude: 43.8777, longitude: 11.1023, order: 50 },
  { slug: 'siena',         name: 'Siena',         region: 'Toscana', latitude: 43.3188, longitude: 11.3308, order: 50 },

  // ── Trentino-Alto Adige ──
  { slug: 'bolzano',       name: 'Bolzano',       region: 'Trentino-Alto Adige', latitude: 46.4983, longitude: 11.3548, order: 50 },
  { slug: 'trento',        name: 'Trento',        region: 'Trentino-Alto Adige', latitude: 46.0748, longitude: 11.1217, order: 50 },

  // ── Umbria ──
  { slug: 'perugia',       name: 'Perugia',       region: 'Umbria', latitude: 43.1107, longitude: 12.3908, order: 50 },
  { slug: 'terni',         name: 'Terni',         region: 'Umbria', latitude: 42.5636, longitude: 12.6427, order: 50 },

  // ── Valle d'Aosta ──
  { slug: 'aosta',         name: 'Aosta',         region: "Valle d'Aosta", latitude: 45.7372, longitude: 7.3206, order: 50 },

  // ── Veneto ──
  { slug: 'belluno',       name: 'Belluno',       region: 'Veneto', latitude: 46.1400, longitude: 12.2170, order: 50 },
  { slug: 'rovigo',        name: 'Rovigo',        region: 'Veneto', latitude: 45.0705, longitude: 11.7902, order: 50 },
  { slug: 'treviso',       name: 'Treviso',       region: 'Veneto', latitude: 45.6669, longitude: 12.2430, order: 50 },
  { slug: 'vicenza',       name: 'Vicenza',       region: 'Veneto', latitude: 45.5455, longitude: 11.5354, order: 50 },
];

// ── Legacy slugs (from the original French seed) → canonical Italian slug ──
// If the database still holds these cities, they are merged into the
// Italian ones to avoid duplicates in the dropdown (e.g. "Milan" and "Milano").
const LEGACY_SLUGS = {
  milan: 'milano',
  rome: 'roma',
  turin: 'torino',
  florence: 'firenze',
  bologne: 'bologna',
};

/**
 * Merges legacy-slug cities into the canonical ones:
 * moves the linked businesses, then deletes the duplicate.
 */
async function mergeLegacyCities() {
  let merged = 0;

  for (const [legacySlug, canonicalSlug] of Object.entries(LEGACY_SLUGS)) {
    const legacy = await prisma.city.findUnique({ where: { slug: legacySlug } });
    if (!legacy) continue;

    const canonical = await prisma.city.findUnique({ where: { slug: canonicalSlug } });
    if (!canonical) continue; // the canonical city does not exist yet: nothing to merge

    // Move the businesses from the legacy city to the canonical one
    const moved = await prisma.business.updateMany({
      where: { cityId: legacy.id },
      data: { cityId: canonical.id },
    });

    await prisma.city.delete({ where: { id: legacy.id } });
    merged++;
    console.log(`   ↪︎ "${legacy.name}" unita a "${canonical.name}" (${moved.count} attività spostate)`);
  }

  if (merged > 0) console.log(`🧹 ${merged} città duplicate rimosse`);
  return merged;
}

async function seedCities() {
  console.log(`🏙️  Seeding ${CITIES.length} città italiane (capoluoghi di provincia)…`);

  let created = 0;
  let updated = 0;

  for (const c of CITIES) {
    const existing = await prisma.city.findUnique({ where: { slug: c.slug } });
    await prisma.city.upsert({
      where: { slug: c.slug },
      // Updates the descriptive fields but leaves isActive alone (an admin choice)
      update: {
        name: c.name,
        region: c.region,
        latitude: c.latitude,
        longitude: c.longitude,
        order: c.order,
      },
      create: { ...c, isActive: true },
    });
    existing ? updated++ : created++;
  }

  // Clean up duplicates left by the old seed (milan/milano, rome/roma…)
  await mergeLegacyCities();

  const total = await prisma.city.count();
  console.log(`✅ ${created} create, ${updated} aggiornate — ${total} città in totale nel database`);
}

// Direct execution: node prisma/seeds/cities-italia.js
if (require.main === module) {
  seedCities()
    .catch((e) => {
      // Database unreachable: print a clear message instead of a stack trace
      if (e.errorCode === 'P1001' || /Can't reach database server/i.test(e.message || '')) {
        console.error('\n❌ Database non raggiungibile.\n');
        console.error('   Il container PostgreSQL non sembra avviato. Prova:\n');
        console.error('     docker compose up -d postgres');
        console.error('     npx prisma db push        # solo la prima volta (crea le tabelle)');
        console.error('     npm run db:seed:cities\n');
        process.exit(1);
      }
      // Missing tables
      if (e.errorCode === 'P2021' || /does not exist in the current database/i.test(e.message || '')) {
        console.error('\n❌ Tabelle mancanti nel database.\n');
        console.error('   Esegui prima:  npx prisma db push\n');
        process.exit(1);
      }
      console.error('❌ Errore nel seed delle città:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { CITIES, seedCities, mergeLegacyCities };
