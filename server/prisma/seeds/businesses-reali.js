// ============================================
// FIELD CENSUS — African diaspora businesses in Italy
// Real data gathered from public sources (June 2026):
// food guides, press articles, the businesses' own websites.
//
// IMPORTANT NOTES:
// - Coordinates are APPROXIMATE (city centre + offset):
//   they should be refined by geocoding the addresses.
// - The data (addresses, opening hours) must be verified before
//   final publication: businesses change over time.
//
// Run with:  node prisma/seeds/businesses-reali.js
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ── Cities (Italian slugs, matching the frontend filters) ──
const CITIES = [
  { slug: 'milano',  name: 'Milano',  region: 'Lombardia',      latitude: 45.4642, longitude: 9.1900 },
  { slug: 'roma',    name: 'Roma',    region: 'Lazio',          latitude: 41.9028, longitude: 12.4964 },
  { slug: 'torino',  name: 'Torino',  region: 'Piemonte',       latitude: 45.0703, longitude: 7.6869 },
  { slug: 'firenze', name: 'Firenze', region: 'Toscana',        latitude: 43.7696, longitude: 11.2558 },
  { slug: 'bologna', name: 'Bologna', region: 'Emilia-Romagna', latitude: 44.4949, longitude: 11.3426 },
  { slug: 'napoli',  name: 'Napoli',  region: 'Campania',       latitude: 40.8518, longitude: 14.2681 },
  { slug: 'palermo', name: 'Palermo', region: 'Sicilia',        latitude: 38.1157, longitude: 13.3615 },
  { slug: 'genova',  name: 'Genova',  region: 'Liguria',        latitude: 44.4056, longitude: 8.9463 },
  { slug: 'verona',  name: 'Verona',  region: 'Veneto',         latitude: 45.4384, longitude: 10.9916 },
  { slug: 'padova',  name: 'Padova',  region: 'Veneto',         latitude: 45.4064, longitude: 11.8768 },
  { slug: 'bergamo', name: 'Bergamo', region: 'Lombardia',      latitude: 45.6983, longitude: 9.6773 },
  { slug: 'venezia', name: 'Venezia', region: 'Veneto',         latitude: 45.4408, longitude: 12.3155 },
  { slug: 'catania', name: 'Catania', region: 'Sicilia',        latitude: 37.5079, longitude: 15.0830 },
  { slug: 'bari',    name: 'Bari',    region: 'Puglia',         latitude: 41.1171, longitude: 16.8719 },
  { slug: 'parma',   name: 'Parma',   region: 'Emilia-Romagna', latitude: 44.8015, longitude: 10.3279 },
  { slug: 'cagliari', name: 'Cagliari', region: 'Sardegna',     latitude: 39.2238, longitude: 9.1217 },
];

// ── Census entries (category = a category slug created by the seed) ──
const BUSINESSES = [

  // ════════ RESTAURANTS — Milan ════════
  { name: 'Warsa', city: 'milano', category: 'restaurant',
    address: 'Via Melzo 16',
    shortDesc: 'Storico ristorante eritreo di Porta Venezia',
    description: 'Ristorante eritreo nel cuore di Porta Venezia, quartiere che ospita la comunità eritrea-etiope milanese dagli anni \'70. Zighinì, injera e piatti della tradizione del Corno d\'Africa.' },
  { name: 'Ristorante Awash', city: 'milano', category: 'restaurant',
    address: 'Via Palazzi 10',
    shortDesc: 'Il tempio della cucina etiope a Milano',
    description: 'Punto di riferimento della cucina etiope tra Porta Venezia e Stazione Centrale. Cucina tradizionale servita sull\'injera, da condividere secondo l\'usanza etiope.' },
  { name: 'Mosobna', city: 'milano', category: 'restaurant',
    address: 'Via Alessandro Tadino 9B',
    shortDesc: 'Cucina eritrea tradizionale a Porta Venezia',
    description: 'Ristorante eritreo accogliente nella zona di Porta Venezia. Specialità tradizionali del Corno d\'Africa in un ambiente familiare.' },
  { name: 'Injera', city: 'milano', category: 'restaurant',
    address: 'Via Panfilo Castaldi 19',
    shortDesc: 'Specialità etiopi ed eritree',
    description: 'Ristorante dedicato alla cucina del Corno d\'Africa: il nome viene dalla focaccia di teff che accompagna ogni piatto della tradizione etiope ed eritrea.' },
  { name: 'Savana', city: 'milano', category: 'restaurant',
    address: 'Via Luigi Canonica',
    shortDesc: 'La cucina eritrea più autentica di Milano',
    description: 'Cucina eritrea che preserva le tradizioni dei Tigrini e del Corno d\'Africa. Un viaggio gastronomico autentico nel quartiere Sarpi.' },
  { name: 'Balafon', city: 'milano', category: 'restaurant',
    address: 'Via Teodosio 6',
    shortDesc: 'Specialità da Guinea, Congo, Eritrea e Mali',
    description: 'Ristorante multietnico africano in Città Studi: propone specialità di diversi paesi subsahariani tra cui Guinea, Congo, Eritrea e Mali.' },
  { name: 'Dibi 221', city: 'milano', category: 'restaurant',
    address: 'Via Palmanova 143',
    shortDesc: 'Cucina senegalese a Milano',
    description: 'Ristorante senegalese: dibi, thieboudienne, yassa e le grandi grigliate della tradizione di Dakar.' },
  { name: 'Culture Connect', city: 'milano', category: 'restaurant',
    address: 'Via Felice Cavallotti 96, Sesto San Giovanni',
    shortDesc: 'Cucina senegalese e cultura a Sesto San Giovanni',
    description: 'Spazio di cucina senegalese e incontro culturale alle porte di Milano. Piatti della tradizione e iniziative per la comunità.' },

  // ════════ RESTAURANTS — Rome ════════
  { name: 'Sahara', city: 'roma', category: 'restaurant',
    address: 'Viale Ippocrate 43',
    shortDesc: 'Il primo ristorante africano di Roma',
    description: 'Storico ristorante di cucina eritrea ed etiope, il primo di cucina africana a Roma. Ambiente elegante impreziosito da elementi folcloristici.' },
  { name: 'Africa', city: 'roma', category: 'restaurant',
    address: 'Via Gaeta 26',
    shortDesc: 'Sapori autentici di Eritrea ed Etiopia',
    description: 'Ristorante storico vicino a Castro Pretorio: sapori autentici dell\'Eritrea e dell\'Etiopia preparati secondo la tradizione.' },
  { name: 'Ristorante Eritrea', city: 'roma', category: 'restaurant',
    address: 'Piazza del Gazometro 1',
    shortDesc: 'Cucina eritrea a Ostiense, ottimo rapporto qualità/prezzo',
    description: 'Poche specialità tradizionali etiopi ed eritree preparate sapientemente, apprezzato dai clienti abituali per il rapporto qualità/prezzo.' },
  { name: 'Corno d\'Africa', city: 'roma', category: 'restaurant',
    address: 'Via Folco Portinari 7',
    shortDesc: 'Accoglienza e cucina del Corno d\'Africa',
    description: 'Molto apprezzato per l\'accoglienza e l\'atmosfera informale. Menu di specialità della cucina etiope ed eritrea.' },
  { name: 'Enqutatash', city: 'roma', category: 'restaurant',
    address: 'Viale della Stazione Prenestina 55',
    shortDesc: 'Ristorante etiope al Prenestino',
    description: 'Ristorante africano che porta a Roma i piatti e l\'ospitalità della tradizione etiope. Il nome celebra il capodanno etiope.' },
  { name: 'Da Asmara', city: 'roma', category: 'restaurant',
    address: 'Via Cernaia 36',
    shortDesc: 'Cucina eritrea tradizionale vicino Termini',
    description: 'Ristorante rispettoso dei canoni della cucina tradizionale eritrea; il personale guida alla scoperta dei piatti più adatti.' },

  // ════════ RESTAURANTS — Turin ════════
  { name: 'Mar Rosso Afro Restaurant & Cafe', city: 'torino', category: 'restaurant',
    address: 'Via Silvio Pellico 13/E',
    shortDesc: 'Trent\'anni di cucina africana a San Salvario',
    description: 'Locale storico dedicato alla cucina africana, attivo da 30 anni a Torino. Punto di riferimento della comunità del Corno d\'Africa.' },
  { name: 'Jigeenyi', city: 'torino', category: 'restaurant',
    address: 'Borgo Dora',
    shortDesc: 'Cucina afrodiscendente nel polo culturale di Borgo Dora',
    description: 'Ristorante sociale nel polo torinese dedicato alla cultura africana: piatti senegalesi, congolesi, marocchini e gambiani. Yassa di cipolle caramellate e fataya di Dakar.' },

  // ════════ RESTAURANTS — Bologna ════════
  { name: 'Ristorante Africano Adal', city: 'bologna', category: 'restaurant',
    address: 'Bologna',
    shortDesc: 'L\'Africa a Bologna dal 1990',
    description: 'Al servizio della clientela dal 1990: un menu che attraversa i sapori di tutta l\'Africa, dallo zighinì al cous cous, dallo yassa all\'alicià.' },

  // ════════ RESTAURANTS — Florence ════════
  { name: 'Corno d\'Africa Firenze', city: 'firenze', category: 'restaurant',
    address: 'Firenze',
    shortDesc: 'Il regno della cucina eritrea di Almaz',
    description: 'L\'angolo di cucina eritrea a Firenze guidato da Almaz: piatti del Corno d\'Africa preparati con cura familiare.' },
  { name: 'Habesha', city: 'firenze', category: 'restaurant',
    address: 'Zona Santa Maria Novella',
    shortDesc: 'Ristorante multietnico etiope-eritreo',
    description: 'Ristorante multietnico nei pressi di Santa Maria Novella, specializzato in cucina del Corno d\'Africa.' },
  { name: 'Lalibela', city: 'firenze', category: 'restaurant',
    address: 'Via Faenza 87',
    shortDesc: 'Cucina eritrea ed etiope in centro',
    description: 'Cucina eritrea ed etiope nel centro di Firenze: injera, zighinì e specialità vegetariane della tradizione.' },

  // ════════ RESTAURANTS — Naples ════════
  { name: 'Loty', city: 'napoli', category: 'restaurant',
    address: 'Via Bologna 45',
    shortDesc: 'Cucina senegalese al mercato di Via Bologna',
    description: 'Porzioni abbondanti di carne grigliata, riso con pesce, yassa e mafè nel cuore del mercato interetnico di Via Bologna.' },

  // ════════ RESTAURANTS — Palermo ════════
  { name: 'Ciwara', city: 'palermo', category: 'restaurant',
    address: 'Quartiere Vucciria',
    shortDesc: 'Sapori dal Senegal e dal Mali alla Vucciria',
    description: 'Fondato dall\'artista Doudou Diouf, arrivato dal Senegal nel 2009. Cucina senegalese, ivoriana e guineana nel mercato storico della Vucciria: mafè, alloco e musica africana.' },
  { name: 'Moltivolti', city: 'palermo', category: 'restaurant',
    address: 'Quartiere Ballarò',
    shortDesc: 'Cucina siculo-etnica e spazio di comunità a Ballarò',
    description: 'Ristorante e spazio condiviso con staff multiculturale: sapori da Italia, Senegal, Gambia, Afghanistan e oltre, con prodotti freschi del mercato di Ballarò. Mafè e cous cous di pesce.' },
  { name: 'Hama', city: 'palermo', category: 'restaurant',
    address: 'Palermo',
    shortDesc: 'Cucina italo-ghanese, una storia d\'amore',
    description: 'Nato dall\'amore tra Azzurra, siciliana, e Mohammed Musah, ghanese: piatti espressi, ghanesi e siciliani, con cucina sempre attiva dal mezzogiorno.' },

  // ════════ RESTAURANTS — Genoa ════════
  { name: 'Eritrea Huwnet', city: 'genova', category: 'restaurant',
    address: 'Via Macelli di Soziglia 32R',
    shortDesc: 'Vasta scelta di piatti eritrei nel centro storico',
    description: 'Nel cuore dei caruggi genovesi, ampia scelta di piatti tipici eritrei preparati secondo tradizione.' },
  { name: 'Maddalena 36 Takeaway', city: 'genova', category: 'restaurant',
    address: 'Via della Maddalena 36R',
    shortDesc: 'Cucina eritrea da asporto nei caruggi',
    description: 'Takeaway specializzato in cucina eritrea nel centro storico di Genova: sapori del Corno d\'Africa da portare via.' },

  // ════════ RESTAURANTS — Verona / Padua ════════
  { name: 'Zigni', city: 'verona', category: 'restaurant',
    address: 'Verona',
    shortDesc: 'Ristorante eritreo a Verona',
    description: 'Cucina eritrea per tutte le esigenze: il nome viene dallo zighinì, lo stufato speziato simbolo della cucina del Corno d\'Africa.' },
  { name: 'Massawa', city: 'padova', category: 'restaurant',
    address: 'Via Andrea Costa 12',
    shortDesc: 'Specialità del Corno d\'Africa in ambiente familiare',
    description: 'Ristorante eritreo ed etiope: specialità del Corno d\'Africa servite in un ambiente familiare e confortevole.' },

  // ════════ RESTAURANTS — Bergamo ════════
  { name: 'Dahlak', city: 'bergamo', category: 'restaurant',
    address: 'Via Borgo Palazzo 82/I',
    shortDesc: 'Sapori eritrei autentici a Borgo Palazzo dal 2014',
    description: 'Ristorante eritreo inaugurato nel 2014 nello storico quartiere di Borgo Palazzo: zighinì, injera e l\'ospitalità del Corno d\'Africa.' },
  { name: 'AFR\'EAT', city: 'bergamo', category: 'restaurant',
    address: 'Via S. Giovanni Bosco 25/A',
    shortDesc: 'Ristorante tipico africano a Bergamo',
    description: 'Cucina tipica africana a Bergamo: piatti della tradizione subsahariana in un ambiente accogliente.' },

  // ════════ RESTAURANTS — Venice / Catania / Bari ════════
  { name: 'Africa Experience', city: 'venezia', category: 'restaurant',
    address: 'Dorsoduro, zona Accademia',
    shortDesc: 'Cucina africana e senegalese a Dorsoduro',
    description: 'Ristorante africano a Venezia: piatti senegalesi come il pollo yassa al limone e cipolle, in un progetto di cucina e integrazione.' },
  { name: 'Orient Experience 4', city: 'catania', category: 'restaurant',
    address: 'Catania',
    shortDesc: 'Il primo ristorante di Catania gestito da migranti',
    description: 'Primo ristorante etnico solidale di Catania, gestito da migranti e rifugiati con il sostegno dell\'UNHCR: cucine dal mondo, Africa inclusa.' },
  { name: 'Hakuna Matata', city: 'bari', category: 'restaurant',
    address: 'Bari',
    shortDesc: 'Cucina africana a Bari',
    description: 'Ristorante africano a Bari: un viaggio nei sapori del continente, dal cous cous ai piatti subsahariani.' },

  // ════════ RESTAURANTS — Parma / Cagliari ════════
  { name: 'Africa 2', city: 'parma', category: 'restaurant',
    address: 'Centro storico',
    shortDesc: 'Cucina eritrea in centro a Parma dal 1983',
    description: 'In pieno centro a Parma dal 1983: la cucina africana, e in particolare quella eritrea, è il punto di forza, accanto alla pizzeria.' },
  { name: 'Mosob Ristorante Etiope', city: 'parma', category: 'restaurant',
    address: 'Via Volturno 55A',
    shortDesc: 'Ristorante etiope a Parma',
    description: 'Cucina etiope autentica: injera, zighinì e specialità vegetariane della tradizione, servite secondo il rito del mosob.' },
  { name: 'Cucina di Mariam', city: 'cagliari', category: 'restaurant',
    address: 'Via Oristano 25',
    shortDesc: 'La prima cucina senegalese di Cagliari',
    description: 'Il primo e unico locale di cucina tipica senegalese a Cagliari: thieboudienne, yassa e mafè preparati da Mariam.' },
  { name: 'Kilimangiaro', city: 'cagliari', category: 'restaurant',
    address: 'Cagliari',
    shortDesc: 'Cucina keniota a conduzione familiare',
    description: 'Ristorante africano a conduzione familiare: piatti tipici del Kenya e dell\'Africa orientale nel cuore della Sardegna.' },

  // ════════ HAIRDRESSERS / BARBERS ════════
  { name: 'Rella\'s Eden', city: 'milano', category: 'coiffeur',
    address: 'Via San Gregorio 18',
    shortDesc: 'La specialista milanese dei capelli afro e ricci',
    description: 'Salone specializzato nella cura dei capelli ricci e afro a Porta Venezia. Rella Toska ha oltre vent\'anni di esperienza in trattamenti, treccine e acconciature naturali.' },
  { name: 'Glamour Style', city: 'torino', category: 'coiffeur',
    address: 'Corso Belgio 110',
    shortDesc: 'Trattamenti per capelli ricci e afro naturali',
    description: 'Salone dedicato a preservare e valorizzare la bellezza dei capelli, con trattamenti specifici per capelli ricci e afro naturali.' },
  { name: 'Fade Company', city: 'roma', category: 'coiffeur',
    address: 'Zona Torpignattara',
    shortDesc: 'Barber shop afro a Torpignattara',
    description: 'Barber shop che unisce tecnica e stile per valorizzare l\'immagine: fade, rasature e cura del capello afro nel quartiere multiculturale di Torpignattara.' },
  { name: 'Afro Image Barber & Hair Saloon', city: 'bologna', category: 'coiffeur',
    address: 'Bologna',
    shortDesc: 'Dreadlocks, treccine e colore per uomo e donna',
    description: 'Parrucchiere afro per uomo e donna a Bologna: dreadlocks, treccine, colore e trattamenti per capelli ricci e afro.' },
  { name: 'Treccine Afro Bologna & Extension', city: 'bologna', category: 'coiffeur',
    address: 'Via Piana 2',
    shortDesc: 'Specialiste di treccine ed extension',
    description: 'Salone specializzato in treccine africane ed extension: box braids, twist e acconciature protettive.' },
  { name: 'Salone Ricci Crespi', city: 'padova', category: 'coiffeur',
    address: 'Via Riccardo Wagner 5',
    shortDesc: 'Capelli ricci e afro naturali a Padova',
    description: 'Aperto nel 2022: servizi dedicati a preservare e valorizzare i capelli ricci e afro naturali.' },
  { name: 'Parrucchiera Africana', city: 'napoli', category: 'coiffeur',
    address: 'Napoli e Campania (servizio a domicilio)',
    shortDesc: 'Treccine e acconciature afro a domicilio in Campania',
    description: 'Servizio mobile di parrucchiere afro in tutta la Campania: treccine classiche e strette, dreads, crochet braids e twist senegalesi.' },

  // ════════ GROCERY STORES ════════
  { name: 'Emporio Officinale (ex Afro World)', city: 'bologna', category: 'epicerie',
    address: 'Via O. Serra 22',
    shortDesc: 'Alimentari, cosmetici e artigianato africano dal 2001',
    description: 'Nato come Afro World nel 2001: prodotti alimentari africani, cosmetici e artigianato. Un punto di riferimento per la comunità bolognese.' },
  { name: 'Sylvestina Holding', city: 'napoli', category: 'epicerie',
    address: 'Via Venezia 31',
    shortDesc: 'Mini market e tavola calda nigeriana',
    description: 'Mini market e tavola calda nigeriana: prodotti alimentari africani e piatti classici come riso e fagioli, nel cuore multietnico di Napoli.' },
  { name: 'Alimentari africani di Piazza Vittorio', city: 'roma', category: 'epicerie',
    address: 'Via Giovanni Giolitti 179-181',
    shortDesc: 'Prodotti africani nel quartiere Esquilino',
    description: 'I dintorni di Piazza Vittorio sono costellati di negozi alimentari con prodotti africani: farine, spezie, pesce essiccato e verdure tropicali.' },

  // ════════ FASHION ════════
  { name: 'KeChic', city: 'milano', category: 'mode',
    address: 'Milano',
    shortDesc: 'La sartoria multietnica che unisce Milano a Dakar',
    description: 'Sartoria italo-africana e brand di abbigliamento: capi dal taglio occidentale realizzati con tessuti Wax e Bazin coloratissimi, con ago e filo da Dakar a Milano.' },
  { name: 'likeUafrica', city: 'milano', category: 'mode',
    address: 'Milano',
    shortDesc: 'Tessuti wax originali e artigianato africano',
    description: 'Negozio africano a Milano: tessuti tradizionali, wax originali, artigianato e abbigliamento etnico made in Africa.' },
  { name: 'Coloriage', city: 'roma', category: 'mode',
    address: 'Roma',
    shortDesc: 'Sartoria sociale e scuola di moda gratuita',
    description: 'Sartoria sociale e scuola di moda gratuita: tessuti italiani di recupero incontrano cotoni dell\'Africa occidentale, wax e tessuti artigianali dipinti a mano.' },
  { name: 'MAFRIC', city: 'milano', category: 'mode',
    address: 'Milano',
    shortDesc: 'Moda sostenibile con tessuti wax africani',
    description: 'Brand di moda etica: abbigliamento etnico e accessori realizzati a mano in Italia con materiali upcycling e tessuti wax africani, in collaborazione con sartorie sociali.' },

  // ════════ BEAUTY ════════
  { name: 'Divina BLK', city: 'milano', category: 'beaute',
    address: 'Milano',
    shortDesc: 'Cosmetici per capelli ricci, super-ricci e afro',
    description: 'Linea di prodotti cosmetici dedicati ai capelli ricci, super-ricci e afro, distribuita in punti vendita in tutta Italia.' },
  { name: 'Afrodreams', city: 'roma', category: 'beaute',
    address: 'Roma',
    shortDesc: 'Prodotti per treccine, extension e cosmetici afro dal 2003',
    description: 'Negozio di riferimento dal 2003 per prodotti per capelli, treccine, extension, accessori e cosmetici afro.' },
];

// ── Deterministic offset, so map markers do not overlap ──
const offset = (i) => ((i % 7) - 3) * 0.004;

async function main() {
  console.log('🌍 Censimento attività della diaspora africana in Italia\n');

  // 1. Cities (Italian slugs)
  console.log('🏙️  Città...');
  const cityMap = {};
  for (const c of CITIES) {
    const city = await prisma.city.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
    cityMap[c.slug] = city;
  }
  console.log(`✅ ${Object.keys(cityMap).length} città pronte`);

  // 2. Existing categories
  const categories = await prisma.category.findMany();
  const catMap = Object.fromEntries(categories.map(c => [c.slug, c]));
  const missing = [...new Set(BUSINESSES.map(b => b.category))].filter(s => !catMap[s]);
  if (missing.length) {
    throw new Error(`Categorie mancanti nel database: ${missing.join(', ')} — esegui prima il seed principale.`);
  }

  // 3. Placeholder owner for the census listings
  const owner = await prisma.user.upsert({
    where: { email: 'censimento@ubuntuhub.it' },
    update: {},
    create: {
      email: 'censimento@ubuntuhub.it',
      firstName: 'Censimento',
      lastName: 'UbuntuHub',
      role: 'BUSINESS',
      isVerified: true,
    },
  });

  // 4. Businesses
  console.log('🏢 Attività...');
  let created = 0;
  for (let i = 0; i < BUSINESSES.length; i++) {
    const b = BUSINESSES[i];
    const city = cityMap[b.city];
    const slug = b.name
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + b.city;

    await prisma.business.upsert({
      where: { slug },
      update: {},
      create: {
        ownerId: owner.id,
        name: b.name,
        slug,
        description: b.description,
        shortDesc: b.shortDesc,
        address: b.address,
        cityId: city.id,
        categoryId: catMap[b.category].id,
        // approximate coordinates (city centre + offset) — to be geocoded
        latitude: city.latitude + offset(i),
        longitude: city.longitude + offset(i + 3),
        // `status` drives publication: listings are visible straight away.
        // `isVerified` is a badge instead, earned only after a human check:
        // the census grants it to nobody.
        status: 'VERIFIED',
        isVerified: false,
      },
    });
    created++;
  }

  console.log(`✅ ${created} attività censite e classificate\n`);

  // Summary by category
  const summary = {};
  for (const b of BUSINESSES) summary[b.category] = (summary[b.category] || 0) + 1;
  console.log('📊 Riepilogo per categoria:');
  for (const [cat, n] of Object.entries(summary)) console.log(`   ${cat}: ${n}`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
