# Architecture and design

Inventory is a Next.js App Router app with a thin JSON API and a PostgreSQL snapshot store. The browser is the working copy: React components mutate one `{ items, movements }` document, and the server replaces both tables on every save.

## Context

Operators at Nawabi Hyderabad House Greenwood and Kwality Ice-cream keep two order sheets in sync: restaurant packaging/tickets and ice-cream supplies/flavors. The product copies those sheets into a shared board so receive colors, garage backup, and activity are visible to everyone on the same database.

```
┌─────────────┐     GET/PUT/POST      ┌──────────────────┐     pg Pool      ┌────────────┐
│ Browser UI  │  /api/inventory(*)    │ Next.js server   │                 │ PostgreSQL │
│ (React)     │ ◄──────────────────►  │ src/app/api      │ ◄──────────────►│ 3 tables   │
└─────────────┘                       └──────────────────┘                 └────────────┘
        │                                      │
        │ InventoryProvider                    │ ensureDatabase()
        │ + inventory-store                    │ advisory lock 814271
        ▼                                      ▼
  in-memory snapshot                     CREATE TABLE IF NOT EXISTS
  (optimistic, queued saves)             seed if items is empty
```

## Runtime stack

| Layer | Choice |
| --- | --- |
| UI | React 19, Next.js 16 App Router, client components for inventory |
| Styling | Tailwind CSS 4, shadcn/ui (base-nova), Lucide icons |
| Charts | Recharts on the dashboard |
| Persistence | `pg` against PostgreSQL (`serverExternalPackages: ["pg"]`) |
| Hosting shape | `output: "standalone"` for the Docker image |
| Path alias | `@/*` → `src/*` |

Pages are server components that render a client view:

| Route | File | View |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | `DashboardView` |
| `/inventory` | `src/app/inventory/page.tsx` | `InventoryView` |
| `/log` | `src/app/log/page.tsx` | `MovementsView` |

`src/app/layout.tsx` wraps all pages in `Providers` → `InventoryProvider` + toasts, then `AppShell` (nav and reload).

API routes call `connection()` from `next/server` so they always run per request and are not prerendered with a stale database snapshot.

## Client snapshot store

`src/lib/inventory-store.ts` is a tiny external store (`subscribe` / `getSnapshot`) used with `useSyncExternalStore`.

On mount, `hydrateFromServer()` fetches `GET /api/inventory`.

- If the database has never been saved (`pristine: true`) and the browser still has `localStorage["kwality-inventory-v2"]` from the old client-only app, that local snapshot is written back once.
- Otherwise the server snapshot becomes the cache and the localStorage key is removed.
- If the fetch fails, the UI shows the error and keeps the in-memory seed copy.

`writeInventory(snapshot)` updates the cache immediately, notifies listeners, and queues a `PUT /api/inventory`. Saves are serialized. HTTP 5xx retries after 1.5s; 4xx does not retry. `restoreInventorySeed()` queues `POST /api/inventory/reset` instead.

`InventoryProvider` (`src/components/inventory-provider.tsx`) is the only place that should mutate the snapshot. It exposes:

| Method | Effect on items | Activity row |
| --- | --- | --- |
| `upsertItem` | Add or replace an item | Order date/qty, date received, receive color, garage — only when those fields change |
| `setReceiveColor` | Color + `receiveStatus` | Status (`Received all`, `Received partial`, `Did not receive anything`, `Cleared receive color`) |
| `setFlavorSize` | One flavor size; `lastCountedAt` | Count (`Tubs: 6 → 5`) |
| `setGarageQuantity` | `garageQuantity` only | Count (`Garage backup: 3 → 4`) |
| `recordMovement` | `applyMovement` on on-hand `quantity` | receive / use / waste / adjust / count |
| `deleteItem` | Remove item | None |
| `reset` | Seed items + seed movements | Seed history only |

Receive, use, waste, and count change **floor stock** (`quantity`). Color, flavor sizes, garage, order dates, and date received do not.

`applyMovement` (`src/lib/inventory.ts`):

- `receive` — add qty; set color yellow if on-hand is still below `orderedQty`, else green
- `use` / `waste` — subtract, floored at 0
- `adjust` — add (caller may pass a negative through the stock dialog as a signed adjust)
- `count` — set on-hand to the counted qty and bump `lastCountedAt`

Adjust in the provider requires `quantity > 0` before apply, so the stock dialog uses a positive number to add. The helper itself still supports a signed delta.

## Server and database

`src/lib/db.ts` owns the pool (one `Pool` on `globalThis`, max 10), schema, and snapshot IO.

### Tables

**`inventory_items`** — one row per SKU. Primary key `id` (text). Flavor sizes are four numeric columns (`flavor_tubs`, `flavor_pints`, `flavor_quat`, `flavor_half`), not a JSON document. Sheet dates are text (`ordered_on`, `received_on`, `expires_on`, `last_counted_at`).

**`stock_movements`** — activity log. `type` is text (`receive`, `use`, `waste`, `adjust`, `count`, `status`, `order`). Ordered by `created_at DESC, id DESC` on read.

**`app_meta`** — single row `id = 1`. `seeded_at` is set when schema is first applied. `user_saved_at` is null until the first successful `PUT` or `POST /reset`. That null is the `pristine` flag.

### Transactions

Reads after `ensureDatabase()`. Writes take `pg_advisory_xact_lock(814271)`, delete all movements, delete all items, batch-insert the new snapshot (400 rows per `INSERT`), then set `user_saved_at`. Concurrent saves serialize on the lock; the last completed snapshot wins.

This design matches the product (one shared clipboard-sized dataset, not a warehouse WMS). It does **not** support partial updates, per-row etags, or an append-only SQL log. History is the `stock_movements` array inside the snapshot.

### Seeding

`src/lib/seed-data.ts` encodes the paper sheets as `SEED_ITEMS` and a small `SEED_MOVEMENTS` list. Empty databases get that copy. **Reload sheets** writes it again on purpose.

## Domain model

Two sheets: `restaurant` and `ice-cream`. Ice-cream splits into `supplies` and `ice-creams`. Flavors group as `regular`, `sugar-free`, `logs` (kulfi-logs).

Receive color and status stay in sync:

| Color | Status | Label |
| --- | --- | --- |
| `green` | `received-all` | Received all |
| `yellow` | `received-partial` | Received partial |
| `red` | `open` | Did not receive anything (status label internally is Ordered) |
| `none` | `blank` | No color |

Dashboard stock status (`src/lib/format.ts`):

- **critical** — on-hand ≤ 0 or ≤ half of reorder point
- **low** — on-hand ≤ reorder point
- **overstocked** — on-hand > 1.4 × par (when par > 0)
- **ok** — otherwise

Suggested order qty is `ceil((par - on-hand) * 10) / 10` when on-hand is at or under reorder point, else 0.

Timestamps in the activity UI use `America/Indiana/Indianapolis`. Sheet calendar dates render in UTC so `YYYY-MM-DD` does not shift a day.

## Validation

`normalizeSnapshot` in `src/lib/inventory.ts` is the contract for `PUT` bodies and for anything read back from JSON. It requires unique item and movement ids, a name, category, unit, and location on each item, a known movement type, and a finite quantity. Missing sheet/list/color fields are inferred from sku/id/notes so older payloads still load.

## Security and operations

- No authentication, CSRF tokens, or per-user audit name. The activity log records *what* changed, not *who*.
- Bind the HTTP port to a trusted network.
- `GET /api/health` pings `SELECT 1` after migrate; use it for load-balancer checks.
- Back up the Postgres instance; replacing the snapshot is not versioned in git.

## File map

```
src/app/                 routes and API
src/components/          screens, dialogs, shell, shadcn/ui
src/lib/db.ts            schema, pool, snapshot SQL
src/lib/inventory-store.ts
src/lib/inventory.ts     metrics, normalize, applyMovement
src/lib/types.ts         unions and labels
src/lib/seed-data.ts     baked order sheets
src/lib/format.ts        money, dates, stock status
```
