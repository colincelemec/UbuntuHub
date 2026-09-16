# UbuntuHub — Full Application Guide

Everything you need to run, understand and work on the platform.

---

## Table of contents

1. [What the platform does](#1-what-the-platform-does)
2. [Architecture](#2-architecture)
3. [Tech stack](#3-tech-stack)
4. [Running the app locally](#4-running-the-app-locally)
5. [Project structure](#5-project-structure)
6. [Data model](#6-data-model)
7. [API reference](#7-api-reference)
8. [Key features explained](#8-key-features-explained)
9. [Internationalisation](#9-internationalisation)
10. [Testing](#10-testing)
11. [Common tasks](#11-common-tasks)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What the platform does

UbuntuHub is a **directory of African diaspora businesses in Italy** —
restaurants, hairdressers, grocery stores, fashion, beauty and services.

**Three kinds of users:**

- **Visitors** browse the directory, search by city and category, read reviews.
  No account required.
- **Registered users** save favourites, write reviews, and publish their own
  business.
- **Administrators** verify submitted businesses, moderate reported reviews
  and manage users.

The interface is available in **Italian, French and English**.

---

## 2. Architecture

```
                        ┌──────────────────────────┐
   Browser ────────────►│  React SPA (client/)     │
                        │  Vercel                  │
                        └────────────┬─────────────┘
                                     │  REST calls (fetch)
                                     ▼
                        ┌──────────────────────────┐
                        │  Express API (server/)   │
                        │  Railway                 │
                        └────────────┬─────────────┘
                                     │  Prisma ORM
                                     ▼
                        ┌──────────────────────────┐
                        │  PostgreSQL              │
                        └──────────────────────────┘

   External services:
   • OpenStreetMap  — map tiles (Leaflet)
   • Nominatim      — address → GPS coordinates
   • Google OAuth   — "Sign in with Google"
   • SMTP (Brevo)   — transactional emails
```

The frontend and the backend are **fully decoupled**: the API only returns
JSON, and the React app is a static bundle. They can be deployed, scaled and
restarted independently.

---

## 3. Tech stack

### Frontend (`client/`)

| Technology | Purpose |
|---|---|
| **React 18** | UI, single-page application |
| **React Router 6** | Client-side routing |
| **Zustand** | Authentication state (lightweight alternative to Redux) |
| **Leaflet + react-leaflet** | Interactive maps with OpenStreetMap tiles |
| **Plain CSS with variables** | Design tokens, no CSS framework |
| **Native `fetch`** | HTTP calls (no axios) |

### Backend (`server/`)

| Technology | Purpose |
|---|---|
| **Node.js + Express** | REST API |
| **Prisma ORM** | Database access, migrations, type safety |
| **PostgreSQL** | Relational database |
| **JWT (jsonwebtoken)** | Stateless authentication |
| **bcryptjs** | Password hashing |
| **Helmet, CORS, express-rate-limit** | Security hardening |
| **express-validator** | Request payload validation |
| **Nodemailer** | Transactional emails |
| **Jest + Supertest** | Automated tests (78 tests) |

### Tooling

Docker Compose for local PostgreSQL, ESLint via `react-scripts`, and the
seed scripts under `server/prisma/seeds/`.

---

## 4. Running the app locally

### Prerequisites

- **Node.js 18+**
- **Docker Desktop** (for the local database)

### First-time setup

```bash
# 1. Install dependencies
cd server && npm install
cd ../client && npm install

# 2. Create the environment files
cd ../server && cp .env.example .env
cd ../client && cp .env.example .env

# 3. Generate a JWT secret and paste it into server/.env
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# 4. Start the database
cd ../server && docker compose up -d postgres

# 5. Create the tables (applies the committed migrations)
npx prisma migrate deploy

# 6. Load the data
npm run db:seed              # categories + demo accounts
npm run db:seed:cities       # 107 Italian provincial capitals
node prisma/seeds/businesses-reali.js   # 53 real businesses
```

### Daily use

```bash
# Terminal 1 — database
cd server && docker compose up -d postgres

# Terminal 2 — API  → http://localhost:5000
cd server && npm run dev

# Terminal 3 — website → http://localhost:3000
cd client && npm start
```

### Demo accounts (development only)

| Email | Password | Role |
|---|---|---|
| `admin@ubuntuhub.com` | `password123` | ADMIN |
| `john@example.com` | `password123` | USER |
| `owner@example.com` | `password123` | BUSINESS |

> These accounts are **never created in production** — the seed script skips
> them when `NODE_ENV=production`.

---

## 5. Project structure

```
ubuntuhub/
├── client/                        React application
│   ├── public/
│   │   ├── index.html
│   │   └── robots.txt             Search engine rules
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/              Route guards (ProtectedRoute, AdminRoute)
│   │   │   ├── business/          ShareButtons
│   │   │   ├── common/            Icon, CitySelect, ImageUpload…
│   │   │   └── layout/            Header, Footer
│   │   ├── contexts/              Language, Toast
│   │   ├── hooks/                 usePageMeta (SEO)
│   │   ├── locales/               translations.js — all UI strings
│   │   ├── pages/                 One file per screen
│   │   ├── services/              API layer (api, business, admin, geocoding)
│   │   ├── stores/                authStore (Zustand)
│   │   └── styles/                One CSS file per page/component
│   └── vercel.json                SPA rewrites + security headers
│
├── server/                        Express API
│   ├── prisma/
│   │   ├── schema.prisma          Data model
│   │   ├── seed.js                Categories, cities, admin account
│   │   └── seeds/
│   │       ├── cities-italia.js   107 provincial capitals
│   │       └── businesses-reali.js  Real business census
│   ├── src/
│   │   ├── config/checkEnv.js     Refuses unsafe production config
│   │   ├── controllers/           Business logic
│   │   ├── middleware/            auth, validation, rate limiting, errors
│   │   ├── routes/                URL → controller mapping
│   │   ├── services/              emailService
│   │   ├── utils/                 errorResponse
│   │   ├── app.js                 Express setup
│   │   └── server.js              Entry point
│   ├── tests/                     Jest + Supertest
│   └── docker-compose.yml
│
├── DEPLOYMENT.md                  Step-by-step deployment guide
├── FULL_APP_GUIDE.md              This document
└── README.md                      Quick overview
```

---

## 6. Data model

Six tables, managed by Prisma:

```
User ──────< Business >────── City
 │              │  │
 │              │  └───────── Category
 │              │
 ├──< Review >──┤
 ├──< Favorite >┤
```

| Table | Purpose |
|---|---|
| **User** | Accounts. Roles: `USER`, `BUSINESS`, `ADMIN` |
| **City** | 107 Italian provincial capitals, with GPS coordinates |
| **Category** | Restaurant, hairdresser, grocery, fashion, beauty, services |
| **Business** | The listings. Status: `PENDING` → `VERIFIED` / `REJECTED` / `SUSPENDED` |
| **Review** | Rating 1-5 + comment, one per user per business, owner can reply |
| **Favorite** | Saved businesses |

A new business is always created as `PENDING` and only appears publicly once an
administrator verifies it.

### Single source of truth

`server/prisma/schema.prisma` is the **only** definition of the database.
Everything else is derived from it: the tables, the migrations, and the
generated client.

Do not maintain a `.sql` file by hand alongside it — the two will drift apart
silently, and someone will eventually run the wrong one. If you need the raw
SQL (for review, documentation or an audit), generate it on demand:

```bash
cd server && npm run db:sql            # prints the SQL to the terminal
cd server && npm run db:sql > schema.sql   # or into a file, then delete it
```

The output always reflects the current schema, so it can never be out of date.

---

## 7. API reference

Base URL: `http://localhost:5000/api`

### Public — no authentication

```
GET    /businesses                 Paginated list (filters: city, category, page, limit)
GET    /businesses/search?q=       Case-insensitive search
GET    /businesses/:slug           Single business (increments view count)
GET    /reviews/:businessId        Reviews of a business
GET    /meta/cities                All active cities
GET    /meta/categories            All categories
GET    /health                     Health check
GET    /sitemap.xml                Sitemap for search engines
```

### Authentication

```
POST   /auth/register              Sign up (sends welcome email)
POST   /auth/login                 Sign in → JWT
POST   /auth/google                Google OAuth
GET    /auth/me                    Current profile               [auth]
```

### Authenticated users

```
POST   /businesses                 Create a listing (status PENDING)
PUT    /businesses/:id             Update (owner only)
DELETE /businesses/:id             Delete (owner only)
POST   /businesses/:id/favorite    Toggle favourite
GET    /businesses/my/list         My businesses
POST   /reviews                    Write a review
PUT    /reviews/:id                Edit my review
POST   /reviews/:id/response       Owner reply
PATCH  /reviews/:id/report         Report a review
GET    /users/favorites            My favourites
GET    /users/my-reviews           My reviews
```

### Administrators

```
GET    /admin/stats                Dashboard counters
GET    /admin/businesses           All listings (filter by status)
GET    /admin/users                All users
PATCH  /admin/users/:id/role       Change a role
GET    /admin/reviews/reported     Reported reviews
PATCH  /businesses/:id/verify      Verify a listing (sends an email)
PATCH  /businesses/:id/status      Change status (sends an email)
```

**Authentication:** send the token in the header —
`Authorization: Bearer <token>`

---

## 8. Key features explained

### Automatic address geocoding

On the "publish a business" form, typing an address places the map pin
automatically. The address is sent to **Nominatim** (OpenStreetMap) 800 ms
after you stop typing, scoped to Italy.

If you drag the pin manually, automatic search stops overriding your choice
until you edit the address again. In edit mode, the first search is skipped so
the saved position is preserved.

### Emails

Two transactional emails, both trilingual: welcome, and business
approved/rejected. Without SMTP configured, they
are printed to the console instead of being sent — development never breaks.

---

## 9. Internationalisation

All UI strings live in a single file: `client/src/locales/translations.js`,
structured as `key: { en, fr, it }`.

```js
import { getTranslation } from '../locales/translations';
const t = (path) => getTranslation(path, language);

t('app.activities.heroTitle')   // → "Discover diaspora businesses"
```

The chosen language is stored in `localStorage` and sets the `<html lang>`
attribute automatically.

**Before committing translation changes, run:**

It verifies that every key exists in all three languages and that every
`t('…')` call in the code points to a key that actually exists. It exits with
an error code, so it can be wired into CI.

---

## 10. Testing

```bash
cd server && npm test
```

**78 tests** across seven suites:

| Suite | What it covers |
|---|---|
| `auth.test.js` | Registration, login, invalid credentials |
| `businesses.test.js` | Listing, pagination, filters, detail, 404 |
| `reviews.test.js` | Reviews, permissions, validation |
| `uploads.test.js` | Upload signature, allowed folders, configuration |
| `validation.test.js` | Italian phone formats, URLs, required fields |
| `sitemap.test.js` | XML validity, health check, error handling |

Tests run against a **mocked Prisma client**, so no database is needed. They
are fast (~2 seconds) and safe to run anywhere.

---

## 11. Common tasks

### Add a translated string

1. Add the key in `client/src/locales/translations.js` with `en`, `fr`, `it`
2. Use it: `t('app.section.myKey')`

### Add an API endpoint

1. Add the method in `server/src/controllers/xxxController.js`
2. Register the route in `server/src/routes/xxx.js`
3. Add validation in `server/src/middleware/validation.js` if it takes a body
4. Write a test in `server/tests/`

### Change the database structure

```bash
# 1. Edit server/prisma/schema.prisma
cd server
npx prisma migrate dev --name describe_your_change
# 2. Commit the generated migration folder
```

### Add a city

Cities come from the database. Add an entry to
`server/prisma/seeds/cities-italia.js` and re-run `npm run db:seed:cities`.
The script is idempotent — it will not create duplicates.

### Inspect the database visually

```bash
cd server && npx prisma studio     # opens http://localhost:5555
```

---

## 12. Troubleshooting

### `Can't reach database server at localhost:5432`

The PostgreSQL container is not running:

```bash
cd server && docker compose up -d postgres
```

Make sure Docker Desktop itself is started.

### `Table does not exist`

The tables have not been created yet:

```bash
cd server && npx prisma migrate dev
```

### The website loads but no data appears

Check the browser console (F12). A `CORS` error means `CLIENT_URL` in
`server/.env` does not match the address you are browsing from.

Also verify `REACT_APP_API_URL` in `client/.env` — it must end with `/api`.

### Prisma errors after changing the schema

Regenerate the client:

```bash
cd server && npx prisma generate
```

### `Too many requests`

The brute-force protection triggered (5 login attempts per 15 minutes). Wait,
or set `NODE_ENV=development` locally, which disables the limiter.

### Emails are not sent

Expected in development. If you see
`📧 [EMAIL - dev mode, SMTP not configured]` in the logs, everything is
working as intended — configure `SMTP_*` variables to send real emails.

---

## Where to go next

- **Deploying online** → see `DEPLOYMENT.md`
- **Docker details** → see `server/DOCKER.md`

---

*UbuntuHub — full application guide, August 2026*
