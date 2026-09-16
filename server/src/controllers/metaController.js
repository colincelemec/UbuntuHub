// ============================================
// Controller: meta (cities & categories)
// Reference data used by the forms (public)
// ============================================

const { PrismaClient } = require('@prisma/client');
const { devDetails } = require('../utils/errorResponse');
const prisma = new PrismaClient();

/**
 * GET /api/meta/cities
 * Active cities, used by the form dropdowns
 */
exports.getCities = async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        region: true,
        latitude: true,
        longitude: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    res.status(200).json({ success: true, count: cities.length, data: { cities } });
  } catch (error) {
    console.error('Erreur getCities:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des villes',
      ...devDetails(error),
    });
  }
};

/**
 * GET /api/meta/categories
 * Active categories
 */
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        color: true,
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });

    res.status(200).json({ success: true, count: categories.length, data: { categories } });
  } catch (error) {
    console.error('Erreur getCategories:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      ...devDetails(error),
    });
  }
};
