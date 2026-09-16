// ============================================
// Controller: Users
// ============================================

const { PrismaClient } = require('@prisma/client');
const { devDetails } = require('../utils/errorResponse');
const prisma = new PrismaClient();

/**
 * GET /api/users/profile
 * Fetch the signed-in user's profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil',
      ...devDetails(error),
    });
  }
};

/**
 * PUT /api/users/profile
 * Update the user's profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone, avatar } = req.body;

    // Build an object holding only the fields that were supplied
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès',
      data: { user: updatedUser },
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil',
      ...devDetails(error),
    });
  }
};

/**
 * GET /api/users/favorites
 * Fetch the user's favourite businesses
 */
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorite.findMany({
      where: { userId: req.user.id },
      include: {
        business: {
          include: {
            city: true,
            category: true,
            owner: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      count: favorites.length,
      data: { favorites },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des favoris',
      ...devDetails(error),
    });
  }
};

/**
 * GET /api/users/my-reviews
 * Fetch every review written by the user
 */
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { userId: req.user.id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            city: {
              select: {
                name: true,
              },
            },
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: { reviews },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des avis:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des avis',
      ...devDetails(error),
    });
  }
};

/**
 * DELETE /api/users/account
 * Delete the user account
 */
exports.deleteAccount = async (req, res) => {
  try {
    // Check whether the user still owns businesses
    const userBusinesses = await prisma.business.count({
      where: { ownerId: req.user.id },
    });

    if (userBusinesses > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous devez supprimer toutes vos entreprises avant de supprimer votre compte',
      });
    }

    // Delete the user (cascade removes reviews and favourites)
    await prisma.user.delete({
      where: { id: req.user.id },
    });

    res.status(200).json({
      success: true,
      message: 'Compte supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression du compte:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du compte',
      ...devDetails(error),
    });
  }
};
