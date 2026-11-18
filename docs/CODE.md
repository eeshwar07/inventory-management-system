# Code structure, libraries, and concepts

This document walks through the inventory app as a codebase: folder layout, how a click becomes a Postgres write, which libraries do what, and the language/framework ideas you will see in the files.

It is a companion to [Architecture](./ARCHITECTURE.md) (system design) and [API](./API.md) (HTTP contract). Here the focus is **reading and changing the source**.

## 1. What the code is doing

The product is a shared board for two order sheets: **Nawabi Hyderabad House Greenwood** (`sheet: "restaurant"`) and **Kwality Ice-cream** (`sheet: "ice-cream"`, lists `supplies` and `ice-creams`).

The browser keeps one JSON **snapshot**:

```ts
{ items: InventoryItem[], movements: StockMovement[] }
```

Every operator action (tap a receive color, change garage backup, receive a delivery, edit date ordered) copies that snapshot, changes it in memory, and `PUT`s the **entire** snapshot to `/api/inventory`. The server deletes all rows and inserts the new arrays. There is no item-level REST resource.

That choice keeps the code small. It also means you should not add `UPDATE inventory_items SET … WHERE id = $1` unless you are changing this design on purpose.

## 2. Repository layout

```
inventory-management-system/
├── src/
│   ├── app/                 Next.js App Router (pages + HTTP routes)
│   ├── components/          Screens and dialogs
│   │   └── ui/              shadcn/ui primitives (Button, Dialog, Table, …)
│   └── lib/                 Domain logic, Postgres, formatting, seed data
├── public/                  Logos and static files
├── docs/                    Markdown + Word documentation
├── Dockerfile               Production image (standalone Next.js)
├── docker-compose.yml       App + Postgres 16
├── neon.ts                  Neon project config (auth off)
├── next.config.ts           standalone output, pg as external package
├── components.json          shadcn registry settings
└── package.json             npm scripts and dependencies
```

TypeScript path alias: `@/*` maps to `src/*` (`tsconfig.json`). Imports look like `@/lib/types`, not `../../lib/types`.

### `src/app` — routes

Next.js **App Router** uses the folder tree as the URL tree.

| File | URL | Role |
| --- | --- | --- |
| `src/app/layout.tsx` | all pages | HTML shell, fonts, `Providers`, `AppShell` |
| `src/app/page.tsx` | `/` | Dashboard |
| `src/app/inventory/page.tsx` | `/inventory` | Order sheets |
| `src/app/log/page.tsx` | `/log` | Activity log |
| `src/app/api/health/route.ts` | `GET /api/health` | DB ping |
| `src/app/api/inventory/route.ts` | `GET`, `PUT /api/inventory` | Load / save snapshot |
| `src/app/api/inventory/reset/route.ts` | `POST /api/inventory/reset` | Reload seed sheets |
| `src/app/globals.css` | — | Tailwind v4 theme tokens |

`layout.tsx` is a **Server Component**. Pages are also server components; they immediately render a client view (`DashboardView`, `InventoryView`, `MovementsView`). Those views have `"use client"` because they use state, clicks, and `useInventory()`.

API `route.ts` files export `GET` / `PUT` / `POST` functions. They call `connection()` from `next/server` so Next.js does not prerender them with a stale database.

### `src/components` — UI

| File | Responsibility |
| --- | --- |
| `providers.tsx` | Wraps the tree in `InventoryProvider`, tooltip, toasts |
| `inventory-provider.tsx` | React context: the only place that should mutate the snapshot |
| `app-shell.tsx` | Sidebar, mobile nav, Reload sheets |
| `dashboard-view.tsx` | Metrics, suggested order, garage list, recent activity, Recharts bar chart |
| `inventory-view.tsx` | Sheet tabs, color filter, restaurant/supplies table, ice-cream size grid |
| `movements-view.tsx` | Activity table and type filter |
| `item-form-dialog.tsx` | Add / edit SKU (dates, qty, garage, color, par, notes) |
| `stock-dialog.tsx` | Receive / use / waste / adjust / count |
| `receive-color-picker.tsx` | Green / yellow / red radio swatches |
| `status-badge.tsx` | Receive badge and stock-status badge |
| `sheet-tabs.tsx`, `ice-cream-list-tabs.tsx` | Sheet / Kwality list switchers |
| `brand-mark.tsx` | Restaurant and Kwality logos |
| `ui/*` | Generated/adapted shadcn components |

### `src/lib` — domain and persistence

| File | Responsibility |
| --- | --- |
| `types.ts` | Enums, `InventoryItem`, `StockMovement`, display labels |
| `inventory.ts` | `computeMetrics`, `applyMovement`, `normalizeSnapshot`, sheet filters |
| `inventory-store.ts` | In-memory snapshot, hydrate, queued PUT/reset |
| `db.ts` | `pg` pool, `CREATE TABLE IF NOT EXISTS`, replace-all save |
| `seed-data.ts` | Baked order-sheet rows (`SEED_ITEMS`, `SEED_MOVEMENTS`) |
| `format.ts` | Currency, sheet dates, Indiana timestamps, stock status |
| `utils.ts` | Re-exports `cn` (className merge) |

## 3. Request path: click → Postgres

Example: operator taps **green** on a restaurant row.

1. `ReceiveColorPicker` calls `onChange("green")`.
2. `InventoryView` passes `setReceiveColor` from `useInventory()`.
3. `setReceiveColor` in `inventory-provider.tsx`:
   - Reads the current snapshot from `getInventorySnapshot()`.
   - Maps items to set `receiveColor` / `receiveStatus`.
   - Prepends a `StockMovement` with `type: "status"` and reason `Received all`.
   - Calls `writeInventory({ items, movements })`.
4. `inventory-store.ts` updates the in-memory cache, notifies React (`useSyncExternalStore`), and `fetch`es `PUT /api/inventory` with the JSON snapshot.
5. `src/app/api/inventory/route.ts` runs `normalizeSnapshot` then `saveInventory`.
6. `db.ts` takes advisory lock `814271`, `DELETE`s movements and items, batch-`INSERT`s the new rows, sets `app_meta.user_saved_at`.

The UI does not wait for the network to paint. The store is **optimistic**. Failed 5xx saves retry after 1.5s; 4xx do not.

`recordMovement` is the only path that changes **floor stock** (`quantity`) via `applyMovement`. Color, flavor sizes, garage, order date, and date received write activity rows but leave on-hand alone.

## 4. Libraries

### Runtime (dependencies)

| Package | Why it is here |
| --- | --- |
| `next` 16 | App Router, `next/font/google`, Route Handlers, standalone Docker output, Turbopack in `next dev` |
| `react` / `react-dom` 19 | UI. Client components use hooks; server components render the page shells |
| `pg` | PostgreSQL client. Listed in `serverExternalPackages` so Next bundles it as a Node external |
| `@base-ui/react` | Headless primitives under shadcn (Button, Dialog, Input, Select). Accessible behavior without styles |
| `shadcn` | CLI / CSS entry (`@import "shadcn/tailwind.css"`). Generated pieces live in `src/components/ui` |
| `class-variance-authority` (`cva`) | Variant maps on UI components (`Button` `variant="outline"` `size="sm"`) |
| `cn` | `clsx` + `tailwind-merge` helper: `cn("px-2", condition && "hidden")` |
| `lucide-react` | Icons (`Package`, `Search`, `MoreHorizontal`) |
| `recharts` | Dashboard “on hand by category” bar chart |
| `sonner` | Toast notifications after save / error |
| `next-themes` | Theme plumbing (used with the shadcn stack) |
| `tw-animate-css` | Animation utilities imported in `globals.css` |
| `@neon/config`, `@neon/env` | Neon project file `neon.ts`; not the Next runtime itself |

### Dev (devDependencies)

| Package | Why it is here |
| --- | --- |
| `typescript` | Strict mode, `noEmit` (Next typechecks) |
| `tailwindcss` 4 | Utility CSS; `@import "tailwindcss"` in `globals.css` |
| `@tailwindcss/turbopack` | CSS loader for `next dev` / Turbopack |
| `eslint`, `eslint-config-next` | `npm run lint` |
| `@types/node`, `@types/react`, `@types/pg` | Type stubs |

There is **no unit-test runner** in `package.json`. Changes to UI flows are verified in the browser.

## 5. Concepts you will see in the code

### Server Components vs Client Components

By default, files under `src/app` are Server Components: they can export `metadata` and must not use `useState`. Anything that uses clicks, context, or browser APIs starts with:

```ts
"use client"
```

`"use client"` is a **boundary**. The page can stay a server component and render `<InventoryView />`; only that module and its imports become client bundles.

### React Context

`InventoryProvider` creates `InventoryContext`. `useInventory()` throws if a component is rendered outside the provider. That is the standard “must wrap with provider” pattern.

### `useSyncExternalStore`

The snapshot is **not** `useState` in the provider. It lives in module-level variables in `inventory-store.ts`. The provider subscribes with `useSyncExternalStore(subscribeInventory, getInventorySnapshot, getServerInventorySnapshot)`.

That lets:

- Any `writeInventory` notify every listener
- Server render use a seed snapshot (`getServerInventorySnapshot`) so SSR does not touch `window`
- Hydration load Postgres once on the client (`hydrateFromServer`)

### Optimistic UI and a save queue

`writeInventory` updates `cached` immediately (`dirty = true`) then `flush()` sends HTTP. A second edit while a PUT is in flight is stored as `pendingJob` and sent after the current one finishes. Reload sheets uses `POST /reset` instead of PUT.

### Snapshot replace-all

`saveInventory` is not an event log in SQL. The activity log **is** the `stock_movements` array inside the snapshot. Two browsers can overwrite each other; last completed PUT wins. An advisory transaction lock (`pg_advisory_xact_lock`) stops two PUTs from interleaving deletes.

### Discriminated unions and `as const`

`src/lib/types.ts` defines closed sets:

```ts
export const SHEETS = ["ice-cream", "restaurant"] as const
export type SheetKind = (typeof SHEETS)[number]
```

That is a TypeScript **const assertion** plus indexed access type. The same pattern is used for units, locations, movement types, and receive colors. Labels live next to the unions (`SHEET_LABELS`, `MOVEMENT_LABELS`) so the UI does not hard-code strings in many files.

### Normalization / inference

`normalizeSnapshot` is the gate on PUT bodies and on JSON from the database. Missing `sheet` is inferred from sku (`RST-` → restaurant). Missing receive color is inferred from notes and dates. That lets older localStorage payloads from the pre-Postgres app still load.

### Domain vs floor stock

| Field | Meaning | Typical editor |
| --- | --- | --- |
| `quantity` | On-hand / floor | Receive, use, waste, count |
| `orderedQty` | Number on the paper order sheet | Edit item |
| `garageQuantity` | Cases in the garage | Sheet cell or Edit item |
| `flavorSizes.*` | Tubs / pints / quat / half | Ice-creams grid |
| `receiveColor` | Green / yellow / red | Color picker |

`applyMovement` only updates `quantity` (and color on receive). Garage and flavor counts have their own setters so they can log activity without pretending to be floor stock.

### CSS: Tailwind v4 + design tokens

`globals.css` uses Tailwind 4’s CSS-first setup (`@import "tailwindcss"`, `@theme inline`). Colors are CSS variables (`--primary`, `--sidebar`) mapped to utilities (`bg-primary`, `text-muted-foreground`). Fonts are loaded with `next/font/google` (Geist, Geist Mono, Fraunces) and exposed as `--font-sans` / `--font-heading`.

### CVA (class-variance-authority)

shadcn `Button` is a styled `@base-ui/react/button` plus `cva(...)`. Variants compile to Tailwind class strings. `cn()` merges them with extra `className` from the caller.

### App Router `connection()`

Route handlers that talk to Postgres call `await connection()` first. In Next 16 this marks the handler as request-time so it is not statically rendered.

### Standalone Docker output

`next.config.ts` sets `output: "standalone"`. `next build` emits a minimal `server.js` plus `.next/static`. The Dockerfile copies those artifacts and runs `node server.js` as user `nextjs` on port 43127.

`pg` is a native-ish Node package, so `serverExternalPackages: ["pg"]` keeps Next from bundling it incorrectly.

## 6. Important types

`InventoryItem` (trimmed) in `src/lib/types.ts`:

- Identity: `id`, `name`, `sku`, `serial`
- Classification: `sheet`, `iceCreamList`, `flavorGroup`, `category`, `unit`, `location`
- Stock: `quantity`, `orderedQty`, `garageQuantity`, `flavorSizes`, `parLevel`, `reorderPoint`, `unitCost`
- Order sheet: `orderedOn`, `receivedOn`, `receiveStatus`, `receiveColor`, `receiveNote`
- Other: `expiresOn`, `lastCountedAt`, `notes`, `supplier`

`StockMovement`: `id`, `itemId`, `itemName`, `type`, `quantity`, `unit`, `reason`, `createdAt`.

Movement `type` values:

| type | Written when |
| --- | --- |
| `receive` / `use` / `waste` / `adjust` / `count` | Stock dialog, or ice-cream size / garage as `count` |
| `status` | Receive color, date received |
| `order` | Date ordered, order quantity |

## 7. How to change common things

| You want to… | Touch |
| --- | --- |
| Add a sheet column | `inventory-view.tsx`; maybe `types.ts` + `db.ts` columns if it is stored |
| Log a new kind of edit | `inventory-provider.tsx` (mirror `setGarageQuantity` / `itemSheetEditMovements`) |
| Change reorder math | `stockStatus` / `suggestedOrderQty` in `format.ts`, used by `computeMetrics` |
| Add a SKU to the default sheets | `seed-data.ts` |
| Change Postgres columns | `SCHEMA_SQL` and `itemToRow` / `itemFromRow` in `db.ts`, plus `InventoryItem` |
| Add an HTTP route | `src/app/api/<name>/route.ts` |
| Restyle a button | `src/components/ui/button.tsx` variants, or `className` at the call site |

## 8. What this codebase is not

- **No auth.** Anyone with the URL can PUT. See Setup / Architecture for hosting notes.
- **No ORM** (no Prisma/Drizzle). SQL is handwritten in `db.ts`.
- **No Redux / Zustand.** The snapshot store is custom and tiny.
- **No item PATCH.** Always full snapshot.
- **No test suite** in npm scripts. ESLint is the automated check.

## 9. Suggested reading order

1. `src/lib/types.ts` — vocabulary
2. `src/components/inventory-provider.tsx` — every mutation
3. `src/lib/inventory-store.ts` — cache and HTTP
4. `src/lib/db.ts` — schema and replace-all
5. `src/components/inventory-view.tsx` — the main screen
6. `src/lib/inventory.ts` — metrics and `applyMovement`
