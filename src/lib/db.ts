import { Pool, type PoolClient, type PoolConfig } from "pg"

import { normalizeSnapshot } from "@/lib/inventory"
import { SEED_ITEMS, SEED_MOVEMENTS } from "@/lib/seed-data"
import type { InventoryItem, InventorySnapshot, StockMovement } from "@/lib/types"

const LOCK_KEY = 814271
const INSERT_BATCH = 400

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS inventory_items (
  id text PRIMARY KEY,
  name text NOT NULL,
  sku text NOT NULL,
  sheet text NOT NULL,
  ice_cream_list text NOT NULL,
  flavor_group text NOT NULL,
  flavor_tubs numeric NOT NULL,
  flavor_pints numeric NOT NULL,
  flavor_quat numeric NOT NULL,
  flavor_half numeric NOT NULL,
  serial integer NOT NULL,
  category text NOT NULL,
  unit text NOT NULL,
  quantity numeric NOT NULL,
  ordered_qty numeric,
  garage_quantity numeric NOT NULL,
  par_level numeric NOT NULL,
  reorder_point numeric NOT NULL,
  unit_cost numeric NOT NULL,
  supplier text NOT NULL,
  location text NOT NULL,
  ordered_on text,
  received_on text,
  receive_status text NOT NULL,
  receive_color text NOT NULL,
  receive_note text NOT NULL,
  expires_on text,
  last_counted_at text NOT NULL,
  notes text NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id text PRIMARY KEY,
  item_id text NOT NULL,
  item_name text NOT NULL,
  type text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  reason text NOT NULL,
  created_at text NOT NULL
);

CREATE TABLE IF NOT EXISTS app_meta (
  id integer PRIMARY KEY CHECK (id = 1),
  seeded_at timestamptz NOT NULL,
  user_saved_at timestamptz
);
`

const ITEM_COLUMNS = [
  "id",
  "name",
  "sku",
  "sheet",
  "ice_cream_list",
  "flavor_group",
  "flavor_tubs",
  "flavor_pints",
  "flavor_quat",
  "flavor_half",
  "serial",
  "category",
  "unit",
  "quantity",
  "ordered_qty",
  "garage_quantity",
  "par_level",
  "reorder_point",
  "unit_cost",
  "supplier",
  "location",
  "ordered_on",
  "received_on",
  "receive_status",
  "receive_color",
  "receive_note",
  "expires_on",
  "last_counted_at",
  "notes",
] as const

const MOVEMENT_COLUMNS = [
  "id",
  "item_id",
  "item_name",
  "type",
  "quantity",
  "unit",
  "reason",
  "created_at",
] as const

type DatabaseGlobal = typeof globalThis & { inventoryPool?: Pool }

let ready: Promise<void> | null = null

function seedSnapshot(): InventorySnapshot {
  return { items: SEED_ITEMS, movements: SEED_MOVEMENTS }
}

function connectionString() {
  const value = process.env.DATABASE_URL
  if (!value) {
    throw new Error(
      "DATABASE_URL is not set. Point it at the PostgreSQL database."
    )
  }
  return value
}

function shouldUseSsl(value: string) {
  if (process.env.DATABASE_SSL === "true") return "require"
  try {
    return new URL(value).searchParams.get("sslmode")
  } catch {
    return null
  }
}

function poolConfig(value: string): PoolConfig {
  const sslMode = shouldUseSsl(value)
  const ssl =
    sslMode === "require" ||
    sslMode === "verify-ca" ||
    sslMode === "verify-full"
      ? {
          rejectUnauthorized:
            sslMode === "verify-ca" || sslMode === "verify-full",
        }
      : undefined

  return {
    connectionString: value,
    max: 10,
    ssl,
  }
}

function getPool() {
  const globalForPg = globalThis as DatabaseGlobal
  if (!globalForPg.inventoryPool) {
    globalForPg.inventoryPool = new Pool(poolConfig(connectionString()))
  }
  return globalForPg.inventoryPool
}

export function ensureDatabase() {
  if (!ready) {
    ready = migrate().catch((error: unknown) => {
      ready = null
      throw error
    })
  }
  return ready
}

async function migrate() {
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY])
    await client.query(SCHEMA_SQL)
    const meta = await client.query("SELECT id FROM app_meta WHERE id = 1")
    if (meta.rowCount === 0) {
      const count = await client.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM inventory_items"
      )
      if (Number(count.rows[0]?.count ?? 0) === 0) {
        await insertSnapshot(client, seedSnapshot())
      }
      await client.query(
        "INSERT INTO app_meta (id, seeded_at) VALUES (1, NOW())"
      )
    }
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}

export async function pingDatabase() {
  await ensureDatabase()
  await getPool().query("SELECT 1")
}

export async function readInventory(): Promise<{
  snapshot: InventorySnapshot
  pristine: boolean
}> {
  await ensureDatabase()
  const pool = getPool()
  const [items, movements, meta] = await Promise.all([
    pool.query<Record<string, unknown>>("SELECT * FROM inventory_items"),
    pool.query<Record<string, unknown>>(
      "SELECT * FROM stock_movements ORDER BY created_at DESC, id DESC"
    ),
    pool.query<{ user_saved_at: Date | null }>(
      "SELECT user_saved_at FROM app_meta WHERE id = 1"
    ),
  ])

  return {
    snapshot: normalizeSnapshot({
      items: items.rows.map(itemFromRow),
      movements: movements.rows.map(movementFromRow),
    }),
    pristine: meta.rows[0]?.user_saved_at == null,
  }
}

export async function saveInventory(snapshot: InventorySnapshot) {
  const normalized = normalizeSnapshot(snapshot)
  await ensureDatabase()
  const client = await getPool().connect()
  try {
    await client.query("BEGIN")
    await client.query("SELECT pg_advisory_xact_lock($1)", [LOCK_KEY])
    await client.query("DELETE FROM stock_movements")
    await client.query("DELETE FROM inventory_items")
    await insertSnapshot(client, normalized)
    await client.query(
      "UPDATE app_meta SET user_saved_at = NOW() WHERE id = 1"
    )
    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
  return normalized
}

export function resetInventory() {
  return saveInventory(seedSnapshot())
}

async function insertSnapshot(client: PoolClient, snapshot: InventorySnapshot) {
  await insertRows(
    client,
    "inventory_items",
    ITEM_COLUMNS,
    snapshot.items.map(itemToRow)
  )
  await insertRows(
    client,
    "stock_movements",
    MOVEMENT_COLUMNS,
    snapshot.movements.map(movementToRow)
  )
}

async function insertRows(
  client: PoolClient,
  table: string,
  columns: readonly string[],
  rows: unknown[][]
) {
  for (let offset = 0; offset < rows.length; offset += INSERT_BATCH) {
    const batch = rows.slice(offset, offset + INSERT_BATCH)
    const values: unknown[] = []
    const placeholders = batch.map((row) => {
      const start = values.length
      values.push(...row)
      const marks = row.map((_, index) => `$${start + index + 1}`)
      return `(${marks.join(", ")})`
    })
    await client.query(
      `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders.join(", ")}`,
      values
    )
  }
}

function itemToRow(item: InventoryItem): unknown[] {
  return [
    item.id,
    item.name,
    item.sku,
    item.sheet,
    item.iceCreamList,
    item.flavorGroup,
    item.flavorSizes.tubs,
    item.flavorSizes.pints,
    item.flavorSizes.quat,
    item.flavorSizes.half,
    Math.trunc(item.serial),
    item.category,
    item.unit,
    item.quantity,
    item.orderedQty,
    item.garageQuantity,
    item.parLevel,
    item.reorderPoint,
    item.unitCost,
    item.supplier,
    item.location,
    item.orderedOn,
    item.receivedOn,
    item.receiveStatus,
    item.receiveColor,
    item.receiveNote,
    item.expiresOn,
    item.lastCountedAt,
    item.notes,
  ]
}

function movementToRow(movement: StockMovement): unknown[] {
  return [
    movement.id,
    movement.itemId,
    movement.itemName,
    movement.type,
    movement.quantity,
    movement.unit,
    movement.reason,
    movement.createdAt,
  ]
}

function itemFromRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: text(row.id),
    name: text(row.name),
    sku: text(row.sku),
    sheet: text(row.sheet) as InventoryItem["sheet"],
    iceCreamList: text(row.ice_cream_list) as InventoryItem["iceCreamList"],
    flavorGroup: text(row.flavor_group) as InventoryItem["flavorGroup"],
    flavorSizes: {
      tubs: num(row.flavor_tubs),
      pints: num(row.flavor_pints),
      quat: num(row.flavor_quat),
      half: num(row.flavor_half),
    },
    serial: num(row.serial),
    category: text(row.category) as InventoryItem["category"],
    unit: text(row.unit) as InventoryItem["unit"],
    quantity: num(row.quantity),
    orderedQty: numOrNull(row.ordered_qty),
    garageQuantity: num(row.garage_quantity),
    parLevel: num(row.par_level),
    reorderPoint: num(row.reorder_point),
    unitCost: num(row.unit_cost),
    supplier: text(row.supplier),
    location: text(row.location) as InventoryItem["location"],
    orderedOn: textOrNull(row.ordered_on),
    receivedOn: textOrNull(row.received_on),
    receiveStatus: text(row.receive_status) as InventoryItem["receiveStatus"],
    receiveColor: text(row.receive_color) as InventoryItem["receiveColor"],
    receiveNote: text(row.receive_note),
    expiresOn: textOrNull(row.expires_on),
    lastCountedAt: text(row.last_counted_at),
    notes: text(row.notes),
  }
}

function movementFromRow(row: Record<string, unknown>): StockMovement {
  return {
    id: text(row.id),
    itemId: text(row.item_id),
    itemName: text(row.item_name),
    type: text(row.type) as StockMovement["type"],
    quantity: num(row.quantity),
    unit: text(row.unit) as StockMovement["unit"],
    reason: text(row.reason),
    createdAt: text(row.created_at),
  }
}

function text(value: unknown) {
  return value == null ? "" : String(value)
}

function textOrNull(value: unknown) {
  if (value == null || value === "") return null
  return String(value)
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function numOrNull(value: unknown) {
  if (value == null || value === "") return null
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
