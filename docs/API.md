# API specification

Base URL: the Next.js origin (local default `http://localhost:43127`).

All inventory routes are dynamic (they call `connection()`). There is no authentication. JSON request and response bodies use `Content-Type: application/json`.

A machine-readable copy of this contract is [openapi.yaml](./openapi.yaml).

## Conventions

- **Snapshot** means `{ items: InventoryItem[], movements: StockMovement[] }`.
- Saves **replace** every item and movement. Clients send the full arrays, not patches.
- `pristine: true` means `app_meta.user_saved_at` is still null (database has only the automatic seed, never a user save or reset).
- Error bodies: `{ "error": "<message>" }`.
- Unknown fields on items are passed through `normalizeItem` via object spread; required semantic fields are still validated.

## GET /api/health

Liveness of the Node process and Postgres (schema migrate + `SELECT 1`).

**Response 200**

```json
{ "ok": true }
```

**Response 503** (database unreachable or `DATABASE_URL` missing)

```json
{ "ok": false }
```

No `error` string on this route; check server logs.

## GET /api/inventory

Load the current snapshot.

**Response 200**

```json
{
  "items": [ { "...InventoryItem" : true } ],
  "movements": [ { "...StockMovement" : true } ],
  "pristine": true
}
```

`movements` are newest first (`created_at` descending, then `id` descending).

**Response 500**

```json
{ "error": "DATABASE_URL is not set. Point it at the PostgreSQL database." }
```

or

```json
{ "error": "Could not load inventory." }
```

## PUT /api/inventory

Replace the snapshot. Body must be a JSON object with `items` and `movements` arrays. Extra top-level keys (including `pristine`) are ignored.

**Request**

```http
PUT /api/inventory
Content-Type: application/json
```

```json
{
  "items": [],
  "movements": []
}
```

**Response 200** — the normalized snapshot plus `pristine: false`.

**Response 400** — `InventoryPayloadError` or invalid JSON, for example:

| `error` | When |
| --- | --- |
| `Inventory payload must be an object.` | Body is not an object |
| `Saved inventory is missing items or movements.` | Either array missing |
| `Item N is missing an id.` / `… missing a name.` | Item invalid |
| `Item <id> is missing category, unit, or location.` | Required enums missing |
| `Duplicate item id …` / `Duplicate movement id …` | Ids not unique |
| `Movement <id> has an unknown type.` | `type` not in the movement enum |
| `Movement <id> has an invalid quantity.` | `quantity` is not finite |

**Response 500** — missing `DATABASE_URL` or unexpected database failure (`Could not save inventory.`).

## POST /api/inventory/reset

Overwrite items and movements with `SEED_ITEMS` and `SEED_MOVEMENTS` from `src/lib/seed-data.ts`. Sets `user_saved_at`, so the next GET is `pristine: false`.

No request body.

**Response 200** — seeded snapshot plus `pristine: false`.

**Response 500**

```json
{ "error": "Could not reload the sheet inventory." }
```

## Resource schemas

### InventoryItem

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Primary key. Trimmed, required, unique |
| `name` | string | Required, non-empty |
| `sku` | string | Default `""` |
| `sheet` | `"ice-cream"` \| `"restaurant"` | Inferred from sku/id if omitted (`RST-` / `rst-` → restaurant) |
| `iceCreamList` | `"supplies"` \| `"ice-creams"` | Inferred (`FLV-` / `flavor-` → ice-creams) |
| `flavorGroup` | `"regular"` \| `"sugar-free"` \| `"logs"` | Default `regular` |
| `flavorSizes` | `{ tubs, pints, quat, half }` | Numbers, default 0 |
| `serial` | number | Sheet row number; default index + 1 |
| `category` | see enum below | Required |
| `unit` | see enum below | Required |
| `quantity` | number | On-hand / floor stock. Default 0 |
| `orderedQty` | number \| null | Quantity on the order sheet |
| `garageQuantity` | number | Garage backup. Default 0 |
| `parLevel` | number | Default 0 |
| `reorderPoint` | number | Default 0 |
| `unitCost` | number | USD. Default 0 |
| `supplier` | string | Default `""` |
| `location` | `"Front counter"` \| `"Kitchen"` \| `"Dry storage"` \| `"Garage"` | Required |
| `orderedOn` | string \| null | `YYYY-MM-DD` (or ISO); sheet date ordered |
| `receivedOn` | string \| null | Date received |
| `receiveStatus` | `"received-all"` \| `"received-partial"` \| `"open"` \| `"blank"` | Inferred from color/notes if omitted |
| `receiveColor` | `"green"` \| `"yellow"` \| `"red"` \| `"none"` | Inferred from status if omitted |
| `receiveNote` | string | Default `""` |
| `expiresOn` | string \| null | |
| `lastCountedAt` | string | ISO datetime; default now if missing |
| `notes` | string | Default `""` |

**category:** `ice-cream`, `packaging`, `party`, `beverages`, `dry-goods`, `disposables`, `ops`

**unit:** `case`, `pack`, `each`, `box`, `roll`, `bag`, `bottle`

Example item:

```json
{
  "id": "rst-12oz",
  "name": "12 oz containers",
  "sku": "RST-012",
  "sheet": "restaurant",
  "iceCreamList": "supplies",
  "flavorGroup": "regular",
  "flavorSizes": { "tubs": 0, "pints": 0, "quat": 0, "half": 0 },
  "serial": 2,
  "category": "packaging",
  "unit": "case",
  "quantity": 0,
  "orderedQty": 2,
  "garageQuantity": 0,
  "parLevel": 2,
  "reorderPoint": 1,
  "unitCost": 0,
  "supplier": "House vendor",
  "location": "Kitchen",
  "orderedOn": "2026-05-23",
  "receivedOn": "2026-05-27",
  "receiveStatus": "received-all",
  "receiveColor": "green",
  "receiveNote": "Received all on 27th may",
  "expiresOn": null,
  "lastCountedAt": "2026-05-27T12:00:00.000Z",
  "notes": ""
}
```

### StockMovement

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Required, unique |
| `itemId` | string | May be empty string if omitted |
| `itemName` | string | Denormalized name at log time |
| `type` | MovementType | Required |
| `quantity` | number | Finite. `0` for status / date-only order rows |
| `unit` | unit enum | Default `each` if missing or unknown |
| `reason` | string | Human note shown in Activity |
| `createdAt` | string | ISO datetime; default now if omitted |

**MovementType:** `receive`, `use`, `waste`, `adjust`, `count`, `status`, `order`

Typical `reason` values written by the UI:

| type | reason examples |
| --- | --- |
| `order` | `Ordered on 17th November`, `Date ordered: 23rd May → 17th November`, `Ordered 3 case`, `Order quantity: 2 case → 3 case`, `Cleared date ordered (23rd May)` |
| `status` | `Received all`, `Received partial`, `Did not receive anything`, `Cleared receive color`, `Received on 18th November`, `Date received: 27th May → 18th November` |
| `count` | `Garage backup: 3 → 4`, `Tubs: 6 → 5` |
| `receive` | Operator note, or `Received` |
| `use` / `waste` / `adjust` / `count` (stock dialog) | Operator note, waste reason, or the type label |

Example movement:

```json
{
  "id": "mov-abc123-xyz",
  "itemId": "rst-12oz",
  "itemName": "12 oz containers",
  "type": "order",
  "quantity": 3,
  "unit": "case",
  "reason": "Order quantity: 2 case → 3 case",
  "createdAt": "2026-11-17T21:34:00.000Z"
}
```

## Client mapping

The browser does not call these routes ad hoc except through `src/lib/inventory-store.ts`:

| UI action | HTTP |
| --- | --- |
| First load | `GET /api/inventory` |
| Any snapshot mutation | `PUT /api/inventory` |
| Reload sheets | `POST /api/inventory/reset` |

There are no item-level REST resources (`/api/inventory/:id`). To change one SKU, GET (or keep the client cache), edit the arrays, PUT the whole snapshot.

## Idempotency and concurrency

PUT is not idempotent in the SQL sense: it always deletes and inserts. Sending the same body twice still rewrites rows and bumps `user_saved_at`.

Concurrent PUTs take a transaction advisory lock. The last writer’s snapshot is what GET returns. Clients do not send If-Match headers.

## Versioning

There is no `/v1` prefix. Breaking payload changes should keep `normalizeItem` / `normalizeMovement` accepting older documents where possible (the infer helpers exist for that).
