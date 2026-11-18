# Onboarding

This app is the shared inventory board for **Nawabi Hyderabad House Greenwood** (restaurant packaging and tickets) and **Kwality Ice-cream** (cups, cones, and flavors). Counts, receive colors, garage backup, and the activity log live in PostgreSQL, so everyone who opens the site sees the same data.

There is no login. Treat the URL as a private tool: anyone who can load it can change inventory.

## For operators

### The three screens

| Screen | Route | What it is for |
| --- | --- | --- |
| Dashboard | `/` | On-hand vs garage, out-of-stock SKUs, suggested order, recent activity |
| Inventory | `/inventory` | The order sheets: restaurant, Kwality supplies, and Kwality ice-creams |
| Activity | `/log` | Timestamped history of sheet edits, receives, usage, waste, and counts |

Reload the seeded order sheets from **Reload sheets** in the sidebar. That replaces live items and movements with the copy baked into the app. Use it only when you mean to wipe local edits.

### Restaurant and supplies sheets

Each row matches the paper order sheet: serial, item, date ordered, quantity, receive status, color, and garage backup.

Receive color:

| Color | Meaning |
| --- | --- |
| Green | Received all |
| Yellow | Received partial |
| Red | Did not receive anything |
| No color | Not marked |

Tap a color on the row to update status. That writes an Activity row. Filter the sheet to show a color first when you are walking the list.

Garage backup is the number of cases (or other units) sitting in the garage, not floor stock. Edit it on the sheet or in **Edit item**. Changing it writes Activity as `Garage backup: 3 → 4` and does not change on-hand quantity.

### Ice-creams list

Under Kwality, open **Ice-creams**. Each flavor has tubs, pints, quat, and half. Editing a size cell writes a count to Activity (`Tubs: 6 → 5`) and does not change the restaurant/supplies on-hand field.

### Recording an order or a receive

Use **Edit item** on a row:

- **Date ordered** and **Sheet quantity** log as type **Ordered**.
- **Date received** logs as type **Status** (`Received on …` or `Date received: … → …`).
- Receive color in the form logs the same labels as tapping color on the sheet.

**Receive delivery** on the row menu posts a **Received** movement and increases on-hand quantity. If the new on-hand is still under the ordered quantity, the row turns yellow; otherwise it turns green.

Other row-menu movements:

- **Log usage** — subtract from on-hand
- **Log waste** — subtract from on-hand; waste cost uses unit cost when you have entered one
- **Enter count** — set on-hand to the counted number

Unit costs start at $0 because they were not on the original sheets. Add a cost on a SKU if you want dollar totals on the dashboard.

### Activity log

Search by item name or note. Filter by type: Received, Used, Waste, Adjusted, Counted, Status, Ordered.

Unchanged saves do not add duplicate rows. Color taps, size counts, and garage edits that leave the value the same are ignored.

## For developers

### First hour

1. Read the root [README](../README.md) and [Setup](./SETUP.md).
2. Get Postgres up and `DATABASE_URL` in `.env.local`.
3. Run `npm install` and `npm run dev`.
4. Open [http://localhost:43127](http://localhost:43127), switch sheets, tap a color, edit garage, and confirm the row appears on **Activity**.
5. Skim [Architecture](./ARCHITECTURE.md) and [API](./API.md) before changing save or schema code.

### Where to look

| If you are changing… | Start here |
| --- | --- |
| Sheets, colors, garage, item editor | `src/components/inventory-view.tsx`, `item-form-dialog.tsx` |
| Activity rows written on edit | `src/components/inventory-provider.tsx` |
| Dashboard metrics and suggested order | `src/lib/inventory.ts` (`computeMetrics`), `dashboard-view.tsx` |
| Postgres schema or snapshot replace | `src/lib/db.ts` |
| Seeded order-sheet copy | `src/lib/seed-data.ts` |
| HTTP contract | `src/app/api/` and [API](./API.md) |
| Types and labels | `src/lib/types.ts` |

### How data is saved

The browser holds one inventory snapshot (`items` + `movements`). Every edit updates that snapshot and `PUT`s the whole thing to `/api/inventory`. The API deletes and re-inserts both tables inside a transaction. Do not assume row-level SQL updates.

The first time a fresh database is opened, a leftover browser `localStorage` copy from the old client-only app can be imported once. After the first successful save, that key is cleared.

### Conventions

- npm and Node (not Bun). Next.js App Router under `src/app`.
- Client components that touch inventory must sit under `InventoryProvider`.
- Dates on the sheets are stored as `YYYY-MM-DD` text. Display uses Indiana local time for timestamps and UTC calendar dates for sheet dates.
- Port **43127** in development and Docker.
- `npm run lint` before you push. There is no unit-test runner in this repo; verify UI flows in the browser.

### Reloading seed data

`POST /api/inventory/reset` (the sidebar **Reload sheets** button) writes `SEED_ITEMS` and `SEED_MOVEMENTS` over live data. That is destructive. Prefer a Neon or local database you can throw away while developing.
