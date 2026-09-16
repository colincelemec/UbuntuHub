# Dockerfile pour UbuntuHub API (Development)
FROM node:18-alpine

# Installer dumb-init pour gérer les signaux correctement
RUN apk add --no-cache dumb-init openssl

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY --chown=nodejs:nodejs package*.json ./

# Installer toutes les dépendances
RUN npm ci

# Copier le schéma Prisma
COPY --chown=nodejs:nodejs prisma ./prisma/

# Générer le Prisma Client
RUN npx prisma generate

# Copier le reste du code
COPY --chown=nodejs:nodejs . .

# Exposer le port de l'API
EXPOSE 5000

# Utiliser l'utilisateur non-root
USER nodejs

# Utiliser dumb-init pour gérer les processus
ENTRYPOINT ["dumb-init", "--"]

# Commande de démarrage (peut être overridée dans docker-compose)
CMD ["node", "src/server.js"]
