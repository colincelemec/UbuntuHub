# UbuntuHub — Deployment Guide

This guide takes you from your local machine to a live website, step by step.
No prior deployment experience is assumed.

**Target architecture:**

```
   Visitor
      │
      ├──► ubuntuhub.com ............ Vercel  (React, the public site)
      │           │
      │           └── API calls ──► api.ubuntuhub.com ... Railway (Node/Express)
      │                                        │
      │                                        └──► PostgreSQL (Railway)
```

**Estimated time:** 2 to 3 hours the first time.

---

## Table of contents

1. [Before you start](#1-before-you-start)
2. [Prepare the code](#2-prepare-the-code)
3. [Create the database migration](#3-create-the-database-migration)
4. [Deploy the database and API on Railway](#4-deploy-the-database-and-api-on-railway)
5. [Populate the database](#5-populate-the-database)
6. [Deploy the website on Vercel](#6-deploy-the-website-on-vercel)
7. [Connect your domain name](#7-connect-your-domain-name)
8. [Configure emails](#8-configure-emails)
9. [Configure Google sign-in](#9-configure-google-sign-in)
10. [Post-launch checklist](#10-post-launch-checklist)
11. [Search engine setup](#11-search-engine-setup)
12. [Real costs](#12-real-costs)
13. [Common problems](#13-common-problems)
14. [Living with a production site](#14-living-with-a-production-site)

---

## 1. Before you start

### Accounts to create (all free to begin with)

| Service | Purpose | Link |
|---|---|---|
| **GitHub** | Hosts the code; both platforms connect to it | github.com |
| **Railway** | Runs the API and the database | railway.app |
| **Vercel** | Runs the React website | vercel.com |
| **Brevo** | Sends transactional emails | brevo.com |

Sign up to Railway and Vercel **using your GitHub account** — it makes
everything that follows much simpler.

### The domain name

If you do not own one yet, buy it from a registrar such as Namecheap, OVH or
Gandi (roughly €10-15 per year for a `.com`).

You can deploy **without a domain** at first: Vercel gives you a free address
like `ubuntuhub.vercel.app`. You can attach the real domain later without
breaking anything.

### Check that everything runs locally

Before deploying, make sure the project works on your machine:

```bash
# Terminal 1 — database
cd server
docker compose up -d postgres

# Terminal 2 — API
cd server
npm run dev          # should print "✅ Connected to PostgreSQL"

# Terminal 3 — website
cd client
npm start            # opens http://localhost:3000
```

If it does not work locally, it will not work online. Fix it first.

---

## 2. Prepare the code

### 2.1 Generate your production secrets

These values must **never** be shared or committed to Git. Open a terminal and
store the output somewhere safe (a password manager, not a text file):

```bash
# 1. JWT secret — protects every user session
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# 2. Administrator password
node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))"
```

> **Why this matters:** `JWT_SECRET` is the key that signs login tokens.
> Anyone who knows it can mint an administrator token and take over the site.
> The example value in `.env.example` is public on GitHub — the server now
> **refuses to start in production** if you left it in place.

### 2.2 Make sure no secret reaches GitHub

```bash
cd /path/to/ubuntuhub
git status
git ls-files | grep -E "\.env$"     # must return NOTHING
```

If a `.env` file shows up, remove it from tracking immediately:

```bash
git rm --cached server/.env client/.env
git commit -m "Remove .env files from version control"
```

### 2.3 Push the code to GitHub

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

If the repository does not exist yet, create it on github.com (**New
repository**, keep it **private**), then follow the instructions shown.

---

## 3. Create the database migration

This is done **once**, on your machine. It generates the SQL instructions that
will create the tables in production.

```bash
cd server
docker compose up -d postgres      # the local database must be running
npm run db:migrate:baseline
```

> **Why `baseline` and not `migrate dev`?** The local database was originally
> created with `prisma db push`, which builds the tables without recording any
> migration history. `prisma migrate dev` sees that empty history, reports
> "drift", and offers to **wipe the database**. The baseline script instead
> generates the SQL from the schema and marks it as already applied — same
> result, no data loss. Run it once; afterwards use `npm run db:migrate`.

Prisma creates a folder `prisma/migrations/…_init/` containing `migration.sql`.
**This folder must be committed:**

```bash
git add prisma/migrations
git commit -m "Initial database migration"
git push
```

> **Why this matters:** without migrations you would have to create the tables
> by hand in production, with no history and no way to roll back. With them,
> every deployment applies structural changes automatically — the `start`
> script runs `prisma migrate deploy` before booting the server.

---

## 4. Deploy the database and API on Railway

### 4.1 Create the project

1. Go to **railway.app** → **Login with GitHub**
2. **New Project** → **Deploy PostgreSQL**
   → a database appears in your dashboard
3. In the same project: **New** → **GitHub Repo** → pick `ubuntuhub`

### 4.2 Point Railway at the right folder

The repository contains both `client/` and `server/`. Railway must only look
at the server:

1. Click the service you just created → **Settings** tab
2. **Root Directory** → enter `server`
3. Leave **Start Command** empty (`package.json` handles it)

### 4.3 Environment variables

In the API service → **Variables** tab → **New Variable** for each:

| Variable | Value | Note |
|---|---|---|
| `NODE_ENV` | `production` | ⚠️ essential |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | references the project database |
| `JWT_SECRET` | your secret from step 2.1 | ⚠️ never reuse it elsewhere |
| `JWT_EXPIRES_IN` | `7d` | session lifetime |
| `CLIENT_URL` | `https://ubuntuhub.com,https://www.ubuntuhub.com` | see box below |
| `EMAIL_FROM` | `UbuntuHub <no-reply@ubuntuhub.com>` | |
| `SMTP_HOST` | `smtp-relay.brevo.com` | step 8 |
| `SMTP_PORT` | `587` | |
| `SMTP_USER` | provided by Brevo | |
| `SMTP_PASS` | provided by Brevo | |

> **`CLIENT_URL` accepts several domains separated by commas.**
> It controls which sites the browser is allowed to call your API from (the
> CORS rule). Include **every** address the site will be served from: with and
> without `www`. Miss one and the site will load but no data will appear.
>
> Until you have a domain, use the Vercel address:
> `https://ubuntuhub.vercel.app`

**Do not set `PORT`** — Railway injects it automatically.

### 4.4 Deploy

Railway redeploys automatically after every `git push`. Watch the
**Deployments** tab → **View Logs**. You should see:

```
✅ Configuration verified
✅ Connected to PostgreSQL via Prisma
🚀 UbuntuHub API Server
🚀 Environment: production
```

If you see `❌ Invalid configuration`, read the message — it names the exact
variable causing the problem.

### 4.5 Expose the API

**Settings** → **Networking** → **Generate Domain**.
You get an address like `ubuntuhub-production.up.railway.app`.

Test it immediately:

```bash
curl https://YOUR-API.up.railway.app/health
```

Expected response:
```json
{"success":true,"message":"UbuntuHub API is running","environment":"production"}
```

---

## 5. Populate the database

The database is empty. It needs categories, cities and the business census.

In Railway, open the API service → **Settings** → the terminal button. Or
install the CLI: `npm i -g @railway/cli`, then `railway link` and
`railway run <command>`.

Run the three commands **in this order**:

```bash
# 1. Categories + your administrator account
SEED_ADMIN_EMAIL="you@email.com" SEED_ADMIN_PASSWORD="THE-GENERATED-PASSWORD" npm run db:seed

# 2. The 107 Italian provincial capitals
npm run db:seed:cities

# 3. The census of 53 real businesses
node prisma/seeds/businesses-reali.js
```

> **Security:** in production the seed **refuses to run** without
> `SEED_ADMIN_PASSWORD`, and it automatically skips the demo accounts
> (`john@example.com`, `owner@example.com`) and the fake sample businesses. You
> will never end up with a `password123` account online.

Check the data landed:

```bash
curl "https://YOUR-API.up.railway.app/api/meta/cities" | head -c 300
```

---

## 6. Deploy the website on Vercel

### 6.1 Import the project

1. **vercel.com** → **Add New** → **Project**
2. Select the `ubuntuhub` repository
3. **Root Directory** → click **Edit** → choose `client`
4. Framework Preset: **Create React App** (detected automatically)

`client/vercel.json` is already in the repository: it configures the rewrites
and security headers, so there is nothing to do.

### 6.2 Environment variables

Before clicking Deploy, expand **Environment Variables**:

| Variable | Value |
|---|---|
| `REACT_APP_API_URL` | `https://YOUR-API.up.railway.app/api` |
| `REACT_APP_GOOGLE_CLIENT_ID` | your OAuth client ID (step 9) |

> ⚠️ **Do not forget the trailing `/api`.** This is the most common mistake —
> without it, every request hits nothing.
>
> ⚠️ `REACT_APP_*` variables are **embedded in the JavaScript sent to the
> browser**. Never put a secret there: no secret Stripe key, no password. Only
> public values.

### 6.3 Deploy

Click **Deploy** and wait 2-3 minutes. Vercel shows the site address.

**After changing any environment variable you must redeploy:**
**Deployments** tab → `···` menu on the latest deployment → **Redeploy**.
Variables are baked in at build time.

---

## 7. Connect your domain name

### 7.1 On Vercel

1. Project → **Settings** → **Domains** → **Add**
2. Enter `ubuntuhub.com` and confirm
3. Add `www.ubuntuhub.com` too (Vercel will offer a redirect)

Vercel displays the DNS records to create.

### 7.2 At your registrar (Namecheap, OVH, Gandi…)

In your domain's DNS zone, create:

| Type | Name | Value |
|---|---|---|
| `A` | `@` | `76.76.21.21` |
| `CNAME` | `www` | `cname.vercel-dns.com` |

> Use the exact values Vercel shows you — they can change.

DNS propagation takes anywhere from a few minutes to a few hours. Vercel
installs the HTTPS certificate automatically and for free.

### 7.3 A subdomain for the API (optional, but cleaner)

In Railway: **Settings** → **Networking** → **Custom Domain** →
`api.ubuntuhub.com`. Railway gives you a `CNAME` to create at your registrar.

### 7.4 ⚠️ Update the variables

Once the domain is live, **go back and change**:

- **Railway** → `CLIENT_URL` = `https://ubuntuhub.com,https://www.ubuntuhub.com`
- **Vercel** → `REACT_APP_API_URL` = `https://api.ubuntuhub.com/api` (if using a subdomain)
- **Then redeploy both.**

Skipping this step is the number one cause of "the site loads but nothing
appears".

---

## 8. Configure emails

Without SMTP, emails are not sent — they are only printed to the logs.
Sign-ups will work, but nobody will receive a notification.

**Brevo** offers 300 emails per day for free, with no credit card required —
more than enough to start.

1. Create an account on **brevo.com**
2. Menu **SMTP & API** → **SMTP** tab
3. Note the credentials shown
4. Add them to the Railway variables:

```
SMTP_HOST = smtp-relay.brevo.com
SMTP_PORT = 587
SMTP_USER = (your Brevo login)
SMTP_PASS = (the generated SMTP key)
EMAIL_FROM = UbuntuHub <no-reply@ubuntuhub.com>
```

5. **Authenticate your domain** in Brevo (add the SPF and DKIM records to your
   DNS). Without this step your emails will frequently land in spam.

Test it by creating an account on your site — you should receive the welcome
email.

---

## 8b. Configure image uploads (Cloudinary)

Business owners upload a logo and a cover photo from their device. The files
go **straight from the browser to Cloudinary** — they never pass through your
API, which keeps Railway's bandwidth and disk out of the picture.

> This matters: Railway's filesystem is wiped on every deployment. Storing
> uploads on the server would lose every photo each time you ship.

1. Create a free account on **cloudinary.com** (25 monthly credits — far more
   than a young directory needs)
2. **Dashboard** → **Product Environment Credentials** → copy the three values
3. Add them to your Railway variables:

```
CLOUDINARY_CLOUD_NAME = your cloud name
CLOUDINARY_API_KEY    = your API key
CLOUDINARY_API_SECRET = your API secret
```

**Without these variables nothing breaks**: the form falls back to asking for
an image URL, and the API returns a clear "not configured" response.

Images are automatically resized to 1600px max and quality-optimised on
upload, so a 8 MB phone photo becomes a fast-loading web image.

> ⚠️ `CLOUDINARY_API_SECRET` is a server-side secret. It signs upload requests
> and must never appear in `REACT_APP_*` variables, which are embedded in the
> JavaScript sent to browsers.

---

## 9. Configure Google sign-in

The current OAuth client only allows `localhost`. In production you must
declare the real domain, otherwise the "Continue with Google" button will fail.

1. **console.cloud.google.com** → your project → **APIs & Services** → **Credentials**
2. Click your **OAuth 2.0 Client ID**
3. **Authorized JavaScript origins** → add:
   - `https://ubuntuhub.com`
   - `https://www.ubuntuhub.com`
4. **Authorized redirect URIs** → add the same addresses
5. Save (changes can take a few minutes to apply)

---

## 10. Post-launch checklist

Go through this in order. Every item has caused an incident for someone.

### Technical

- [ ] `curl https://YOUR-API/health` → `success: true`
- [ ] `curl https://YOUR-API/sitemap.xml` → lists your businesses
- [ ] Open `https://ubuntuhub.com` → the home page loads
- [ ] Open `https://ubuntuhub.com/activities` then **press F5**
      → the page reloads (⚠️ a 404 means `vercel.json` was not applied)
- [ ] Open a business page in a **private window** → visible without an account
- [ ] Browser console (F12) → no red errors, in particular no `CORS`

### Functional

- [ ] Create an account → the welcome email arrives
- [ ] Sign out, sign back in
- [ ] "Forgot password" → the email arrives and the link works
- [ ] Search a business, filter by city, switch to map view
- [ ] Publish a business: the city search works, the address places the pin
- [ ] Leave a review
- [ ] Switch language → **the whole page** changes
- [ ] Test on a real phone, not just the simulator

### Security

- [ ] Sign in as admin, then **change the password immediately**
- [ ] Confirm `/admin` is unreachable with a normal account
- [ ] The HTTPS padlock is present on every page

---

## 11. Search engine setup

1. Edit `client/public/robots.txt`: replace `ubuntuhub.com` with your real
   domain on the `Sitemap:` line, then redeploy
2. Go to **search.google.com/search-console**
3. **Add property** → **URL prefix** → `https://ubuntuhub.com`
4. Verify ownership (Vercel supports DNS-record verification)
5. **Sitemaps** menu → submit: `https://api.ubuntuhub.com/sitemap.xml`
6. **URL Inspection** → test a business page → **Request indexing**

> **Be patient:** Google takes anywhere from a few days to a few weeks to index
> a brand-new site.
>
> **Known limitation:** the site is a React application. WhatsApp and Facebook
> crawlers do not execute JavaScript, so a shared link will show the generic
> title rather than the business name. Google does execute JavaScript and will
> see your pages correctly. For perfect share previews you would need
> prerendering — worth considering later.

---

## 12. Real costs

Let's be precise, because "free tiers" often hide limits.

### Railway (API + database)

- **Trial**: $5 of credit, valid 30 days, no credit card required
- **Free plan**: $1 of credit per month — enough to experiment, **not** enough
  for a site that stays online
- **Hobby plan**: $5/month including $5 of usage. CPU, memory and network are
  billed beyond that

👉 In practice, expect **$5-10/month** for UbuntuHub at launch traffic.

### Vercel (the website)

- **Hobby plan**: free, with 100 GB of transfer and 1 million requests per
  month — plenty for your early days
- ⚠️ **Important**: the Hobby plan is restricted to **personal, non-commercial
  use**. While UbuntuHub is free and ad-free you are within the rules. The day
  you enable paid subscriptions or advertising, you need the **Pro plan at
  $20/month**

### Everything else

- **Domain**: €10-15/year
- **Brevo**: free up to 300 emails/day

### Total to launch

**Roughly $6-11/month**, plus the domain.

---

## 13. Common problems

### "The site loads but no data appears"

This is almost always CORS. Open the console (F12) → **Console** tab. If you
read `blocked by CORS policy`:

- Check `CLIENT_URL` on Railway: it must match the browser address **exactly**
  (with or without `www`, using `https`)
- No trailing slash
- Redeploy the API after changing it

### 404 when reloading `/activities`

`client/vercel.json` was not applied. Confirm the Vercel **Root Directory** is
`client` and that the file exists in the repository.

### "Cannot reach database server"

Check that `DATABASE_URL` is exactly `${{Postgres.DATABASE_URL}}` (with the
braces) and that the PostgreSQL service is in the **same** Railway project.

### The server refuses to start: "Invalid configuration"

That is intentional — it is the safety guard. The message names the offending
variable. Most often: `JWT_SECRET` still set to the example value, or
`CLIENT_URL` pointing at `localhost`.

### Emails are not sent

Check the Railway logs. If you see `📧 [EMAIL - dev mode, SMTP not
configured]`, the `SMTP_*` variables are missing.

### "Too many requests. Please try again later."

The brute-force protection did its job (5 login attempts per 15 minutes). Wait
15 minutes. To adjust it: `RATE_LIMIT_MAX_REQUESTS`.

### Google sign-in fails

The production domain is not declared in the Google Cloud console (step 9).
The exact error appears in the browser console.

---

## 14. Living with a production site

### Ship a change

```bash
git add .
git commit -m "Describe the change"
git push
```

Railway and Vercel redeploy automatically. Nothing else to do.

### Change the database structure

```bash
# 1. Edit prisma/schema.prisma
# 2. Create the migration locally
cd server && npm run db:migrate        # Prisma prompts for a migration name
# 3. Push it — production applies it automatically
git add prisma/migrations && git commit -m "…" && git push
```

### Read the logs

- **Railway**: API service → **Deployments** → **View Logs**
- **Vercel**: project → **Deployments** → click a deployment → **Logs**

### Backups

Railway backs PostgreSQL up automatically on paid plans. For a manual copy:

```bash
railway run pg_dump '$DATABASE_URL' > backup-$(date +%F).sql
```

Do this **before every significant migration**.

### Monitoring

Create a free account on **uptimerobot.com** and monitor
`https://YOUR-API/health` every 5 minutes. You will get an email if the API
goes down — better to hear it from a robot than from a user.

---

## Quick reference

```bash
# Generate a secret
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# Check the API responds
curl https://YOUR-API/health

# Run checks before pushing
cd server && npm test
cd client && npm run build

# Create a migration (only after changing prisma/schema.prisma)
cd server && npm run db:migrate
```

---

*UbuntuHub — deployment guide, August 2026*
