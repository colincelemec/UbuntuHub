// ============================================
// Controller: businesses
// ============================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('../services/emailService');
const { devDetails } = require('../utils/errorResponse');

/**
 * @route   GET /api/businesses
 * @desc    List every business (paginated and filtered)
 * @access  Public
 */
exports.getAllBusinesses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      city,
      category,
      status = 'VERIFIED'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Two distinct notions, not to be confused:
    //   • `status`     → is the listing published? (VERIFIED = yes)
    //   • `isVerified` → has the team checked the listing? (badge)
    // We therefore filter on publication alone: a listing that is visible
    // but not yet checked still shows, simply without a badge.
    const where = {
      status: status
    };

    if (city) {
      where.city = { slug: city };
    }

    if (category) {
      where.category = { slug: category };
    }

    // Fetch the businesses, paginated
    const [businesses, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          city: {
            select: { name: true, slug: true }
          },
          category: {
            select: { name: true, slug: true, icon: true }
          },
          owner: {
            select: { firstName: true, lastName: true }
          }
        },
        // No privileged placement: only the real rating counts, and on a
        // tie the most recently published listing comes first.
        orderBy: [
          { averageRating: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.business.count({ where })
    ]);

    res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur getAllBusinesses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des entreprises',
      ...devDetails(error)
    });
  }
};

/**
 * @route   GET /api/businesses/search
 * @desc    Advanced business search
 * @access  Public
 */
exports.searchBusinesses = async (req, res) => {
  try {
    const { q, city, category, lat, lng, radius = 10 } = req.query;

    // As above: we search among the published listings, whether or
    // not they have been checked.
    const where = {
      status: 'VERIFIED'
    };

    // Free-text search
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { shortDesc: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (city) {
      where.city = { slug: city };
    }

    if (category) {
      where.category = { slug: category };
    }

    const businesses = await prisma.business.findMany({
      where,
      include: {
        city: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true, icon: true } }
      },
      take: 50
    });

    // When lat/lng are supplied, filter by distance
    let results = businesses;
    if (lat && lng) {
      results = businesses.filter(business => {
        const distance = calculateDistance(
          parseFloat(lat),
          parseFloat(lng),
          business.latitude,
          business.longitude
        );
        return distance <= parseFloat(radius);
      });
    }

    res.status(200).json({
      success: true,
      data: results,
      count: results.length
    });

  } catch (error) {
    console.error('Erreur searchBusinesses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la recherche',
      ...devDetails(error)
    });
  }
};

/**
 * @route   GET /api/businesses/:slug
 * @desc    Fetch one business by its slug
 * @access  Public
 */
exports.getBusinessBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const business = await prisma.business.findUnique({
      where: { slug },
      include: {
        city: true,
        category: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        reviews: {
          where: { isVisible: true },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }

    // Increment the view counter
    await prisma.business.update({
      where: { id: business.id },
      data: { viewCount: { increment: 1 } }
    });

    res.status(200).json({
      success: true,
      data: business
    });

  } catch (error) {
    console.error('Erreur getBusinessBySlug:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'entreprise',
      ...devDetails(error)
    });
  }
};

/**
 * @route   POST /api/businesses
 * @desc    Create a new business
 * @access  Private (authenticated)
 */
exports.createBusiness = async (req, res) => {
  try {
    const userId = req.user.id;
    const body = req.body;

    // Allow-list of accepted fields (the client is never trusted with
    // status, ownerId, isVerified and the like)
    const allowed = [
      'name', 'description', 'shortDesc',
      'cityId', 'address', 'zipCode', 'latitude', 'longitude',
      'categoryId',
      'phone', 'email', 'website', 'whatsapp',
      'logo', 'coverImage',
      'facebook', 'instagram', 'twitter', 'tiktok',
    ];
    const businessData = {};
    for (const key of allowed) {
      if (body[key] !== undefined && body[key] !== '') businessData[key] = body[key];
    }

    // Check that the city exists (and read its default coordinates)
    const city = await prisma.city.findUnique({ where: { id: businessData.cityId } });
    if (!city) {
      return res.status(400).json({ success: false, message: 'Ville invalide' });
    }

    // Check that the category exists
    const category = await prisma.category.findUnique({ where: { id: businessData.categoryId } });
    if (!category) {
      return res.status(400).json({ success: false, message: 'Catégorie invalide' });
    }

    // Coordinates: fall back to the city centre when not supplied
    businessData.latitude = businessData.latitude != null
      ? parseFloat(businessData.latitude) : city.latitude;
    businessData.longitude = businessData.longitude != null
      ? parseFloat(businessData.longitude) : city.longitude;

    // Build a unique slug
    const slug = generateSlug(businessData.name);

    const business = await prisma.business.create({
      data: {
        ...businessData,
        slug,
        ownerId: userId,
        // Published straight away: visible to everyone, including visitors
        // without an account. A directory whose listings sit waiting for
        // approval discourages the very people who submit them.
        status: 'VERIFIED',
        // Not yet checked by the team: hence no badge.
        // An admin may later grant the badge, suspend or reject it.
        isVerified: false
      },
      include: {
        city: true,
        category: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Entreprise créée avec succès. En attente de vérification.',
      data: business
    });

  } catch (error) {
    console.error('Erreur createBusiness:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'entreprise',
      ...devDetails(error)
    });
  }
};

/**
 * @route   PUT /api/businesses/:id
 * @desc    Update a business
 * @access  Private (owner only)
 */
exports.updateBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const body = req.body;

    // Only the owner may proceed
    const business = await prisma.business.findUnique({
      where: { id }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }

    if (business.ownerId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé à modifier cette entreprise'
      });
    }

    // Allow-list: the client may never change status, ownerId and the like
    const allowed = [
      'name', 'description', 'shortDesc',
      'cityId', 'address', 'zipCode', 'latitude', 'longitude',
      'categoryId',
      'phone', 'email', 'website', 'whatsapp',
      'logo', 'coverImage',
      'facebook', 'instagram', 'twitter', 'tiktok',
    ];
    const updateData = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updateData[key] = body[key] === '' ? null : body[key];
    }
    if (updateData.latitude != null) updateData.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude != null) updateData.longitude = parseFloat(updateData.longitude);

    const updated = await prisma.business.update({
      where: { id },
      data: updateData,
      include: {
        city: true,
        category: true
      }
    });

    res.status(200).json({
      success: true,
      message: 'Entreprise mise à jour',
      data: updated
    });

  } catch (error) {
    console.error('Erreur updateBusiness:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour',
      ...devDetails(error)
    });
  }
};

/**
 * @route   DELETE /api/businesses/:id
 * @desc    Delete a business
 * @access  Private (owner or admin)
 */
exports.deleteBusiness = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const business = await prisma.business.findUnique({
      where: { id }
    });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Entreprise non trouvée'
      });
    }

    if (business.ownerId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await prisma.business.delete({
      where: { id }
    });

    res.status(200).json({
      success: true,
      message: 'Entreprise supprimée'
    });

  } catch (error) {
    console.error('Erreur deleteBusiness:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression',
      ...devDetails(error)
    });
  }
};

/**
 * @route   POST /api/businesses/:id/favorite
 * @desc    Add to or remove from favourites
 * @access  Private
 */
exports.toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Is it already a favourite?
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_businessId: {
          userId,
          businessId: id
        }
      }
    });

    if (existing) {
      // Remove from favourites
      await prisma.favorite.delete({
        where: { id: existing.id }
      });

      return res.status(200).json({
        success: true,
        message: 'Retiré des favoris',
        isFavorite: false
      });
    } else {
      // Add to favourites
      await prisma.favorite.create({
        data: {
          userId,
          businessId: id
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Ajouté aux favoris',
        isFavorite: true
      });
    }

  } catch (error) {
    console.error('Erreur toggleFavorite:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      ...devDetails(error)
    });
  }
};

/**
 * @route   GET /api/businesses/my/list
 * @desc    Fetch my own businesses
 * @access  Private
 */
exports.getMyBusinesses = async (req, res) => {
  try {
    const userId = req.user.id;

    const businesses = await prisma.business.findMany({
      where: { ownerId: userId },
      include: {
        city: true,
        category: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: businesses,
      count: businesses.length
    });

  } catch (error) {
    console.error('Erreur getMyBusinesses:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      ...devDetails(error)
    });
  }
};

/**
 * @route   PATCH /api/businesses/:id/verify
 * @desc    Grant the verified badge (ADMIN)
 * @access  Private/Admin
 */
exports.verifyBusiness = async (req, res) => {
  try {
    const { id } = req.params;

    const business = await prisma.business.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        isVerified: true,
        verifiedAt: new Date()
      },
      include: { owner: { select: { email: true, firstName: true } } }
    });

    // Notify the owner by email (non-blocking)
    emailService
      .sendBusinessStatusEmail(business.owner, business, 'VERIFIED')
      .catch(err => console.error('Email approvazione non inviata:', err.message));

    res.status(200).json({
      success: true,
      message: 'Entreprise vérifiée',
      data: business
    });

  } catch (error) {
    console.error('Erreur verifyBusiness:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      ...devDetails(error)
    });
  }
};

/**
 * @route   PATCH /api/businesses/:id/status
 * @desc    Change the status (ADMIN)
 * @access  Private/Admin
 */
exports.updateBusinessStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const business = await prisma.business.update({
      where: { id },
      data: { status },
      include: { owner: { select: { email: true, firstName: true } } }
    });

    // Notify the owner when approved or rejected (non-blocking)
    if (status === 'VERIFIED' || status === 'REJECTED') {
      emailService
        .sendBusinessStatusEmail(business.owner, business, status)
        .catch(err => console.error('Email statut non inviata:', err.message));
    }

    res.status(200).json({
      success: true,
      message: 'Statut mis à jour',
      data: business
    });

  } catch (error) {
    console.error('Erreur updateBusinessStatus:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      ...devDetails(error)
    });
  }
};

/**
 * @route   GET /api/businesses/:id/reviews
 * @desc    Fetch the reviews of a business
 * @access  Public
 */
exports.getBusinessReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          businessId: id,
          isVisible: true
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.review.count({
        where: {
          businessId: id,
          isVisible: true
        }
      })
    ]);

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur getBusinessReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur',
      ...devDetails(error)
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now();
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(value) {
  return value * Math.PI / 180;
}
