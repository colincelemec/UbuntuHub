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

`docker-compose.yml` defines four services. You rarely need more than the
first one.

| Service | Port | Purpose |
|---|---|---|
| `postgres` | 5432 | The database — **the only one you normally need** |
| `redis` | 6379 | Cache, reserved for future use |
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

---

*See `FULL_APP_GUIDE.md` for the full application guide, and `DEPLOYMENT.md`
for production deployment.*
