import { toast } from "sonner"

import { normalizeSnapshot, parseSnapshot } from "@/lib/inventory"
import { SEED_ITEMS, SEED_MOVEMENTS, STORAGE_KEY } from "@/lib/seed-data"
import type { InventorySnapshot } from "@/lib/types"

type SaveJob =
  | { kind: "put"; snapshot: InventorySnapshot }
  | { kind: "reset"; snapshot: InventorySnapshot }

const seedSnapshot: InventorySnapshot = {
  items: SEED_ITEMS,
  movements: SEED_MOVEMENTS,
}

const listeners = new Set<() => void>()
let cached: InventorySnapshot = seedSnapshot
let loadError: string | null = null
let ready = false
let dirty = false
let hydrateStarted = false
let flushing = false
let pendingJob: SaveJob | null = null
let saveFailureAnnounced = false
let retryTimer: ReturnType<typeof setTimeout> | null = null

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

export function isInventoryReady() {
  return ready
}

export function hydrateFromServer() {
  if (typeof window === "undefined" || hydrateStarted) return
  hydrateStarted = true
  void loadFromServer()
}

export function writeInventory(next: InventorySnapshot) {
  queue({ kind: "put", snapshot: next })
}

export function restoreInventorySeed() {
  queue({ kind: "reset", snapshot: seedSnapshot })
}

function queue(job: SaveJob) {
  cached = job.snapshot
  dirty = true
  pendingJob = job
  emit()
  void flush()
}

async function loadFromServer() {
  try {
    const response = await fetch("/api/inventory", { cache: "no-store" })
    if (!response.ok) throw new Error(await readError(response, "Could not load inventory."))
    const body = (await response.json()) as { pristine?: boolean }
    const remote = normalizeSnapshot(body)
    const imported = body.pristine === true ? readLocalSnapshot() : null

    ready = true
    loadError = null
    if (!dirty && imported) {
      writeInventory(imported)
      return
    }
    if (!dirty) {
      cached = remote
      window.localStorage.removeItem(STORAGE_KEY)
    } else if (body.pristine !== true) {
      window.localStorage.removeItem(STORAGE_KEY)
    }
  } catch (cause) {
    ready = true
    loadError =
      cause instanceof Error ? cause.message : "Could not load inventory."
  } finally {
    emit()
  }
}

function readLocalSnapshot() {
  try {
    return parseSnapshot(window.localStorage.getItem(STORAGE_KEY))
  } catch {
    return null
  }
}

async function flush() {
  if (flushing) return
  flushing = true
  try {
    while (pendingJob) {
      const job = pendingJob
      pendingJob = null
      const response = await fetch(
        job.kind === "reset" ? "/api/inventory/reset" : "/api/inventory",
        job.kind === "reset"
          ? { method: "POST" }
          : {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(job.snapshot),
            }
      )
      if (!response.ok) {
        const failure = new Error(
          await readError(
            response,
            job.kind === "reset"
              ? "Could not reload the sheet inventory."
              : "Could not save inventory."
          )
        ) as Error & { retry?: boolean }
        failure.retry = response.status >= 500
        throw failure
      }
      const saved = normalizeSnapshot(await response.json())
      if (!pendingJob) {
        cached = saved
        loadError = null
        saveFailureAnnounced = false
        window.localStorage.removeItem(STORAGE_KEY)
        emit()
      }
    }
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Could not save inventory."
    const retry =
      !(cause instanceof Error) ||
      !("retry" in cause) ||
      cause.retry !== false
    if (retry && !pendingJob) pendingJob = { kind: "put", snapshot: cached }
    if (!saveFailureAnnounced) {
      saveFailureAnnounced = true
      toast.error(message)
    }
    if (retry && !retryTimer) {
      retryTimer = setTimeout(() => {
        retryTimer = null
        void flush()
      }, 1500)
    }
  } finally {
    flushing = false
    if (pendingJob && !retryTimer) void flush()
  }
}

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { error?: unknown }
    if (typeof body.error === "string" && body.error) return body.error
  } catch {
    return fallback
  }
  return fallback
}
