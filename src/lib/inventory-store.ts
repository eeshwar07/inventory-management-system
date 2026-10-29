import { parseSnapshot } from "@/lib/inventory"
import { SEED_ITEMS, SEED_MOVEMENTS, STORAGE_KEY } from "@/lib/seed-data"
import type { InventorySnapshot } from "@/lib/types"

function mergeMissingSeedItems(snapshot: InventorySnapshot): InventorySnapshot {
  const existing = new Set(snapshot.items.map((item) => item.id))
  const missing = SEED_ITEMS.filter((item) => !existing.has(item.id))
  if (missing.length === 0) return snapshot
  return { ...snapshot, items: [...snapshot.items, ...missing] }
}

const seedSnapshot: InventorySnapshot = {
  items: SEED_ITEMS,
  movements: SEED_MOVEMENTS,
}

const listeners = new Set<() => void>()
let cached: InventorySnapshot = seedSnapshot
let cachedRaw: string | null = JSON.stringify(seedSnapshot)
let loadError: string | null = null

function emit() {
  listeners.forEach((listener) => listener())
}

export function subscribeInventory(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getInventorySnapshot(): InventorySnapshot {
  return cached
}

export function getServerInventorySnapshot(): InventorySnapshot {
  return seedSnapshot
}

export function getInventoryError() {
  return loadError
}

export function hydrateFromLocalStorage() {
  if (typeof window === "undefined") return
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = JSON.stringify(seedSnapshot)
    localStorage.setItem(STORAGE_KEY, seeded)
    cachedRaw = seeded
    return
  }
  try {
    const parsed = mergeMissingSeedItems(parseSnapshot(raw) ?? seedSnapshot)
    cached = parsed
    cachedRaw = JSON.stringify(parsed)
    localStorage.setItem(STORAGE_KEY, cachedRaw)
    loadError = null
    emit()
  } catch (cause) {
    loadError =
      cause instanceof Error
        ? cause.message
        : "Could not read saved inventory."
    cached = {
      items: seedSnapshot.items,
      movements: seedSnapshot.movements,
    }
    emit()
  }
}

export function writeInventory(next: InventorySnapshot) {
  const raw = JSON.stringify(next)
  cached = next
  cachedRaw = raw
  loadError = null
  localStorage.setItem(STORAGE_KEY, raw)
  emit()
}

export function restoreInventorySeed() {
  writeInventory({
    items: SEED_ITEMS,
    movements: SEED_MOVEMENTS,
  })
}
