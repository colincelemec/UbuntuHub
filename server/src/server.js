// ============================================
// Server Entry Point
// ============================================

require('dotenv').config();
const { checkEnv } = require('./config/checkEnv');

// Check the configuration BEFORE loading the app:
// in production, an example secret aborts start-up.
checkEnv();

const app = require('./app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Required by Railway/Render to expose the port

// ============================================
// SERVER START-UP
// ============================================

const startServer = async () => {
  try {
    // Database connectivity check
    await prisma.$connect();
    console.log('✅ Connecté à PostgreSQL via Prisma');

    // Start the server
    app.listen(PORT, HOST, () => {
      console.log('');
      console.log('🚀 ============================================');
      console.log(`🚀 UbuntuHub API Server`);
      console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Health Check: /health`);
      console.log('🚀 ============================================');
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} reçu. Arrêt du serveur...`);

  try {
    await prisma.$disconnect();
    console.log('✅ Déconnexion de la base de données réussie');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de l\'arrêt:', error);
    process.exit(1);
  }
};

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start
startServer();
