# Docker Setup

Docker is used **only for local development**, to run PostgreSQL without
installing it on your machine. In production, Railway provides the database.

---

## Prerequisites

- **Docker Desktop** installed and running
  ([download](https://www.docker.com/products/docker-desktop))

Check it works:

```bash
docker --version
docker compose version
```

---

## Normal usage

For everyday development you only need the database. The API runs directly on
your machine with `npm run dev`, which gives you instant hot reload.

```bash
cd server

docker compose up -d postgres     # start the database
docker compose ps                 # check it is running
docker compose stop               # stop it (keeps the data)
```

The database is reachable at `localhost:5432`, which matches the default
`DATABASE_URL` in `.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ubuntuhub_db?schema=public"
```

---

## Available services

`docker-compose.yml` defines three services. You rarely need more than the
first one.

| Service | Port | Purpose |
|---|---|---|
| `postgres` | 5432 | The database — **the only one you normally need** |
| `api` | 5001 | The API inside a container (alternative to `npm run dev`) |
| `prisma-studio` | 5555 | Visual database browser |

### Running the whole stack in containers

```bash
docker compose up --build          # everything, with build
docker compose up -d               # everything, in the background
docker compose logs -f api         # follow the API logs
docker compose down                # stop everything
```

> Note the port difference: containerised, the API is exposed on **5001**
> (`http://localhost:5001`). Run directly with `npm run dev`, it uses **5000**.
> Make sure `REACT_APP_API_URL` in `client/.env` matches whichever you use.

**Migrations run automatically.** The `api` service starts with
`npm run migrate && npm run dev`, so any pending migration is applied before the
server boots. You never have to remember to run it.

> ⚠️ **The trade-off you are accepting.** `prisma migrate deploy` **creates the
> database if it does not exist**. So a typo in `POSTGRES_DB` does not produce a
> connection error: it produces a brand-new, empty database, fully migrated, and
> an application that starts perfectly and displays nothing at all. See
> [Troubleshooting](#the-site-works-but-shows-no-data).

Only the `api` service runs the migrations. `prisma-studio` deliberately does
not: two `prisma migrate deploy` racing for the same lock at start-up is how you
get a random failure on one of them.

---

## Database commands

```bash
# Create the tables (applies the committed migrations)
npx prisma migrate deploy

# Load the data
npm run db:seed              # categories + demo accounts
npm run db:seed:cities       # 107 Italian provincial capitals
node prisma/seeds/businesses-reali.js

# Browse the data visually → http://localhost:5555
npx prisma studio

# Open a psql session
docker compose exec postgres psql -U postgres -d ubuntuhub_db
```

---

## Backup and restore

```bash
# Export
docker compose exec postgres pg_dump -U postgres ubuntuhub_db > backup.sql

# Import
docker compose exec -T postgres psql -U postgres ubuntuhub_db < backup.sql
```

---

## Reset everything

⚠️ **This permanently deletes all local data.**

```bash
docker compose down -v       # removes the containers AND the volumes
docker compose up -d postgres
npx prisma migrate deploy
npm run db:seed && npm run db:seed:cities
node prisma/seeds/businesses-reali.js
```

Useful when the local database ends up in an inconsistent state.

---

## Troubleshooting

### `Cannot connect to the Docker daemon`

Docker Desktop is not running. Start it and wait for the whale icon to settle.

### `Port 5432 is already allocated`

Another PostgreSQL is already using the port — often one installed natively.
Either stop it, or change the port in `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"      # then use 5433 in DATABASE_URL
```

### `Can't reach database server at localhost:5432`

The container is not started:

```bash
docker compose up -d postgres
docker compose ps          # status must be "healthy"
```

The health check takes a few seconds after startup.

### The container starts then stops immediately

Read the logs to find out why:

```bash
docker compose logs postgres
```

A frequent cause is a corrupted volume after an unclean shutdown — see
[Reset everything](#reset-everything).

### The site works but shows no data

No error anywhere: the API answers `200`, the browser console is clean, and the
directory is simply empty. **The application is reading from a database that has
the right tables and no rows.**

Almost always a mismatch between the database that holds your data and the one
named in the configuration. Because migrations run at start-up, a wrong name
silently creates and migrates a new empty database instead of failing.

Find out which databases exist and which one has your data:

```bash
docker compose exec postgres psql -U postgres -c "\l"
docker compose exec postgres psql -U postgres -d ubuntuhub_db -c "SELECT count(*) FROM businesses;"
```

Then check what the API actually receives — `config` prints the file **after**
variable substitution, which is the only reliable view:

```bash
docker compose config | grep DATABASE_URL
```

Compare that name character by character with `POSTGRES_DB` in `.env`. Once
corrected, recreate the containers, because environment variables are read only
at start-up:

```bash
docker compose up -d --force-recreate
```

> ⚠️ **Never add `-v` while investigating.** It deletes the volumes and your
> data with them. Drop the empty leftover database only once the site works
> again.

**If the count really is zero** and no other database holds your rows, the data
is gone and you need to reload it:

```bash
npm run db:seed && npm run db:seed:cities && npm run db:seed:censimento
```

This restores the categories, the 107 cities and the 53 censused businesses —
but **not** the accounts, reviews or listings you created by hand through the
interface. Those are only recoverable from a backup.

---

*See `FULL_APP_GUIDE.md` for the full application guide, and `DEPLOYMENT.md`
for production deployment.*
