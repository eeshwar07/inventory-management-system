# Setup

How to run the inventory app against PostgreSQL. The UI will not stay up without `DATABASE_URL`.

## Prerequisites

- Node.js 22 (the Docker image is `node:22-alpine`; local 20+ is usually fine)
- npm 10+
- PostgreSQL 16+ (local, Docker Compose, or a hosted provider such as Neon)

Clone the repo, then install from the project root:

```bash
npm install
```

## Environment

Copy the example file and point it at your database:

```bash
cp .env.example .env.local
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string. Example: `postgresql://inventory:inventory@localhost:5432/inventory` |
| `DATABASE_SSL` | No | Set to `true` to force TLS. Also honored when the URL includes `sslmode=require`, `verify-ca`, or `verify-full` |
| `POSTGRES_USER` | Docker only | Compose database user (default `inventory`) |
| `POSTGRES_PASSWORD` | Docker only | Compose database password (default `inventory`). Use letters and numbers so it stays valid inside `DATABASE_URL` |
| `POSTGRES_DB` | Docker only | Compose database name (default `inventory`) |
| `PORT` | Docker only | Host port mapped to the app (default `43127`) |

`.env*` files are gitignored except `.env.example`. Do not commit connection strings.

On first connect the app creates `inventory_items`, `stock_movements`, and `app_meta` if they are missing, and seeds them when `inventory_items` is empty. You do not run a separate migration CLI.

## Local Postgres

Create a role and database, then use the example URL:

```bash
sudo -u postgres psql -c "CREATE USER inventory WITH PASSWORD 'inventory' LOGIN;"
sudo -u postgres psql -c "CREATE DATABASE inventory OWNER inventory;"
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

Confirm the database from the app:

```bash
curl -sS http://localhost:43127/api/health
# {"ok":true}
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server on port 43127 (Turbopack) |
| `npm run build` | Production build (`output: "standalone"`) |
| `npm run start` | Production server on port 43127 |
| `npm run lint` | ESLint (`eslint-config-next`) |

`predev` and `prebuild` fail fast if `pg` is not installed, with a message to run `npm install` in the project root.

## Docker Compose (app + Postgres)

From the repo root, on a machine with Docker:

```bash
docker compose up -d --build
```

This starts Postgres 16 and the Next.js standalone server. Open port **43127**.

Set a private `POSTGRES_PASSWORD` before the port is reachable from the internet:

```bash
POSTGRES_PASSWORD=chooseAPrivatePassword docker compose up -d --build
```

Compose wires `DATABASE_URL` to the `db` service for you. You do not need `.env.local` inside the `web` container unless you override it.

## Hosted Postgres (Neon or similar)

Deploy the `Dockerfile` by itself (no Compose `db` service) and set:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
```

Or set `DATABASE_SSL=true`. The `pg` pool uses TLS when `sslmode` is `require`, `verify-ca`, or `verify-full`. For `require`, `rejectUnauthorized` is false so typical Neon/cloud certs work. For `verify-ca` / `verify-full`, certificates are verified.

`neon.ts` is the Neon project config for this repo (`auth: false`). It does not start the Next server by itself.

## Production notes

- The Docker image runs `node server.js` from the Next.js standalone output as user `nextjs`, listening on `0.0.0.0:43127`.
- There is no authentication. Keep the host on a private network or behind a firewall.
- `GET /api/health` is the process-and-database liveness check (HTTP 200 with `{ "ok": true }`, or 503 with `{ "ok": false }`).
- Saving inventory replaces every item and movement row. Back up Postgres if you need point-in-time recovery; the app does not keep a history table.

## Troubleshooting

**`DATABASE_URL is not set`**  
The API returns 500 with that message. Create `.env.local` or export the variable in the process environment.

**`Missing pg. Run npm install in the project root`**  
`node_modules` is incomplete. Run `npm install` at the repo root, not in a subdirectory.

**Health is 503**  
Postgres is down, the URL is wrong, or TLS is required and not enabled. Check `DATABASE_URL` / `DATABASE_SSL`, then `curl /api/health` again.

**Site loads but stays on “Loading inventory…” or shows a load error**  
The browser reached the UI but `GET /api/inventory` failed. Watch the terminal for Postgres errors. The client surfaces the API `error` string.

**Password with `@`, `:`, or `/` in Compose**  
Those characters break the interpolated `DATABASE_URL`. Use letters and numbers.

**Two browsers overwrite each other**  
Saves are last-write-wins on the full snapshot. Refresh after someone else edits if you have the board open for a long time.
