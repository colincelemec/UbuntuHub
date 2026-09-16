# 🌍 UbuntuHub

> A directory of African diaspora businesses in Italy — restaurants,
> hairdressers, grocery stores, fashion, beauty and services.

![React](https://img.shields.io/badge/react-18-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue)
![Tests](https://img.shields.io/badge/tests-62%20passing-brightgreen)
![i18n](https://img.shields.io/badge/languages-IT%20·%20FR%20·%20EN-orange)

---

## What it does

Visitors search businesses by city and category, read reviews and open a
detail page with photos, opening hours and an interactive map — **without
needing an account**.

Registered users save favourites, write reviews and publish their own
business. Administrators verify submissions and moderate reported reviews.

Everything is available in **Italian, French and English**.

---

## Features

**Directory** — search with autocomplete, filters by city (107 Italian
provincial capitals) and category, grid and map views, pagination.

**Business pages** — photo gallery, contact details, opening hours, social
links, reviews with owner replies, Leaflet map, share buttons (WhatsApp,
Facebook, email, copy link).

**Publishing** — a guided form where typing an address automatically places the
map pin (geocoding via OpenStreetMap).

**Accounts** — email/password or Google sign-in, favourites, personal
dashboard.

**Administration** — statistics, business moderation, user management,
reported-review moderation.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6, Zustand, Leaflet, plain CSS with variables |
| Backend | Node.js, Express, Prisma ORM |
| Database | PostgreSQL 15 |
| Auth | JWT + Google OAuth 2.0 |
| Emails | Nodemailer (SMTP) |
| Tests | Jest + Supertest — 78 tests, no database required |
| Hosting | Vercel (frontend) + Railway (API and database) |

---

## Quick start

**Requirements:** Node.js 18+ and Docker Desktop.

```bash
# Install
cd server && npm install
cd ../client && npm install

# Configure
cd ../server && cp .env.example .env
cd ../client && cp .env.example .env

# Generate a JWT secret and paste it into server/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Database + data
cd ../server
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed && npm run db:seed:cities
node prisma/seeds/businesses-reali.js

# Run — two terminals
npm run dev            # API   → http://localhost:5000
cd ../client && npm start   # site → http://localhost:3000
```

Demo account: `admin@ubuntuhub.com` / `password123` (development only — never
created in production).

---

## Useful commands

```bash
# Server
npm run dev              # start with auto-reload
npm test                 # run the test suite
npm run db:studio        # visual database browser
npm run db:seed:cities   # (re)load the 107 cities

# Client
npm start                # development server
npm run build            # production build
```

---

## Documentation

| Document | Contents |
|---|---|
| **[FULL_APP_GUIDE.md](FULL_APP_GUIDE.md)** | Architecture, API reference, data model, common tasks |
| **[DEPLOYMENT.md](DEPLOYMENT.md)** | Step-by-step production deployment |
| **[server/DOCKER.md](server/DOCKER.md)** | Docker configuration details |

---

## Project layout

```
client/    React application (pages, components, translations, styles)
server/    Express API (controllers, routes, middleware, Prisma schema)
```

---

## Roadmap

- Object storage for uploaded images (currently URL-based)
- Prerendering for perfect social-media share previews
- Owner statistics (views, clicks)

---

*Built for the African diaspora community in Italy.*
