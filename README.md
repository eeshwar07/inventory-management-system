# Nawabi Hyderabad House Greenwood inventory

Inventory for **Nawabi Hyderabad House Greenwood** and **Kwality Ice-cream**: cups, lids, cones, cake boxes, takeout trays, biryani boxes, tickets, and garage backup.

The list is loaded from the ice-cream and restaurant order sheets. Quantities, last receive dates, partial receipts, and garage backup counts come from those sheets. Unit costs were not on the sheets, so they start at $0 — add a cost on any SKU if you want dollar totals.

Counts, colors, and the activity log are stored in PostgreSQL. Everyone who opens the site sees the same inventory.

## What you can do

- Open **Inventory** and toggle between Nawabi Hyderabad House Greenwood and Kwality Ice-cream
- Under Kwality, toggle **Supplies** (cups, lids, cones) and **Ice-creams** (product, tubs, pints, quat, half)
- Each list matches the order sheet: S.No, date ordered, quantity, status, and garage backup
- Mark each SKU green (received all), yellow (partial), or red (did not receive)
- Filter either sheet to show a color first: not received, partial, or received all
- See on-hand vs garage backup, out-of-stock SKUs, and a suggested order list on the dashboard
- Maintain every item (par, reorder point, location, notes)
- Receive deliveries, log usage, waste, adjustments, and counts
- Search and filter the list and the activity log

Reload the sheet inventory any time from the sidebar. The first time this browser opens a fresh database, a saved copy from the previous browser-only version is copied in once.

## Run locally

Create the database, then point the app at it:

```bash
sudo -u postgres psql -c "CREATE USER inventory WITH PASSWORD 'inventory' LOGIN;"
sudo -u postgres psql -c "CREATE DATABASE inventory OWNER inventory;"
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:43127](http://localhost:43127).

## Host on a cloud server

The `Dockerfile` and `docker-compose.yml` run the site and PostgreSQL together. On a cloud VM with Docker:

```bash
docker compose up -d --build
```

Open port **43127**. Set `POSTGRES_PASSWORD` to a private value before the port is reachable from the internet. The password should be letters and numbers so it stays valid inside `DATABASE_URL`.

To use a managed Postgres service instead of the Compose database, deploy the `Dockerfile` by itself and set `DATABASE_URL`. Add `?sslmode=require` when the provider requires TLS.

There is no login. Anyone who can open the site can change inventory, so keep the host on a private network or behind a firewall.

## Stack

- Next.js (App Router) and React
- Tailwind CSS and shadcn/ui
- Recharts for the category dashboard
- PostgreSQL for inventory items and the activity log

## Scripts

- `npm run dev` — development server on port 43127
- `npm run build` — production build
- `npm run start` — production server on port 43127
- `npm run lint` — ESLint
