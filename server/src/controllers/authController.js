// ============================================
// Controller: Authentication
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('../services/emailService');
const { devDetails } = require('../utils/errorResponse');

const prisma = new PrismaClient();

// Languages supported for outgoing emails
const SUPPORTED_LANGS = ['it', 'fr', 'en'];
const pickLang = (lang) => (SUPPORTED_LANGS.includes(lang) ? lang : 'it');

/**
 * Generate a JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * POST /api/auth/register
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check whether the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un utilisateur avec cet email existe déjà',
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        isVerified: true,
        createdAt: true,
      },
    });

    // Issue the token
    const token = generateToken(user.id);

    // Send the welcome email (non-blocking: a mail failure must not fail the sign-up)
    emailService
      .sendWelcomeEmail(user, pickLang(req.body.lang))
      .catch((err) => console.error('Email de bienvenue non envoyé:', err.message));

    res.status(201).json({
      success: true,
      message: 'Inscription réussie',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      ...devDetails(error),
    });
  }
};

/**
 * POST /api/auth/login
 * Sign a user in
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Verify the password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email ou mot de passe incorrect',
      });
    }

    // Issue the token
    const token = generateToken(user.id);

    // Return the user without the password
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: userWithoutPassword,
        token,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion',
      ...devDetails(error),
    });
  }
};

/**
 * POST /api/auth/logout
 * Sign out (mostly handled on the client)
 */
exports.logout = async (req, res) => {
  try {
    // Signing out is mostly a client-side matter: it discards the token
    // A token blacklist could be added here if it ever becomes necessary

    res.status(200).json({
      success: true,
      message: 'Déconnexion réussie',
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion',
      ...devDetails(error),
    });
  }
};

/**
 * GET /api/auth/me
 * Return the signed-in user's details
 */
exports.getMe = async (req, res) => {
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
 * PUT /api/auth/update-password
 * Change the password
 */
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Load the user together with the password hash
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
    }

    // Check the current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Mot de passe actuel incorrect',
      });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Store the new password
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newPasswordHash },
    });

    res.status(200).json({
      success: true,
      message: 'Mot de passe mis à jour avec succès',
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du mot de passe',
      ...devDetails(error),
    });
  }
};

// Google client used only to verify ID tokens (no secret needed:
// verification relies on Google's public signing keys)
const googleClient = new OAuth2Client();

/**
 * POST /api/auth/google
 * Google sign-in. The client sends the ID token issued by Google
 * Identity Services; the server verifies it before trusting anything:
 *   - signature and expiry, against Google's public keys;
 *   - audience: the token must have been issued for UbuntuHub's own
 *     client ID, so a token obtained by another application is refused;
 *   - email_verified: an existing account is linked by email only when
 *     Google certifies that the address belongs to the user.
 */
exports.googleAuth = async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({ success: false, message: 'Token Google mancante' });
  }

  if (!process.env.GOOGLE_CLIENT_ID) {
    console.error('GOOGLE_CLIENT_ID non configurato: accesso Google disattivato');
    return res.status(503).json({ success: false, message: 'Accesso con Google non configurato' });
  }

  // 1. Verify the token: signature, expiry and audience
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token Google non valido' });
  }

  const {
    sub: googleId,
    email,
    email_verified: emailVerified,
    given_name: firstName,
    family_name: lastName,
    picture: avatar,
  } = payload;

  // 2. Only an address verified by Google may identify the user
  if (!email || emailVerified !== true) {
    return res.status(401).json({ success: false, message: 'Email Google non verificata' });
  }

  try {
    // 3. Same Google account already known?
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // 4. Existing account with the same (verified) email: link it
      const byEmail = await prisma.user.findUnique({ where: { email } });

      if (byEmail && byEmail.googleId && byEmail.googleId !== googleId) {
        // The address is already linked to a different Google account
        return res.status(409).json({ success: false, message: 'Email già collegata a un altro account Google' });
      }

      if (byEmail) {
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId, avatar: byEmail.avatar || avatar, isVerified: true },
        });
      } else {
        // 5. Brand-new user
        user = await prisma.user.create({
          data: { email, googleId, firstName, lastName, avatar, isVerified: true },
        });

        // Welcome email (non-blocking)
        emailService
          .sendWelcomeEmail(user, pickLang(req.body.lang))
          .catch((err) => console.error('Email di benvenuto (Google) non inviata:', err.message));
      }
    }

    const token = generateToken(user.id);
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Accesso con Google riuscito',
      data: { user: userWithoutPassword, token },
    });
  } catch (error) {
    console.error('Errore Google Auth:', error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'accesso con Google",
      ...devDetails(error),
    });
  }
};
