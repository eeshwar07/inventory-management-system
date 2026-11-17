"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react"
import { toast } from "sonner"

import { formatNumber, formatSheetDate, newId } from "@/lib/format"
import { applyMovement } from "@/lib/inventory"
import {
  getInventoryError,
  getInventorySnapshot,
  getServerInventorySnapshot,
  hydrateFromServer,
  isInventoryReady,
  restoreInventorySeed,
  subscribeInventory,
  writeInventory,
} from "@/lib/inventory-store"
import {
  FLAVOR_SIZE_LABELS,
  MOVEMENT_LABELS,
  RECEIVE_COLOR_LABELS,
  statusFromColor,
} from "@/lib/types"
import type {
  FlavorSize,
  InventoryItem,
  MovementType,
  ReceiveColor,
  StockMovement,
  Unit,
} from "@/lib/types"

interface InventoryContextValue {
  error: string | null
  items: InventoryItem[]
  movements: StockMovement[]
  upsertItem: (
    item: Omit<InventoryItem, "id" | "lastCountedAt"> & { id?: string }
  ) => void
  deleteItem: (id: string) => void
  setReceiveColor: (id: string, color: ReceiveColor) => void
  setFlavorSize: (id: string, size: FlavorSize, quantity: number) => void
  setGarageQuantity: (id: string, quantity: number) => void
  recordMovement: (input: {
    itemId: string
    type: MovementType
    quantity: number
    reason: string
  }) => void
  reset: () => void
}

type ItemInput = Omit<InventoryItem, "id" | "lastCountedAt"> & { id?: string }

function dateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ""
}

function dateChangeReason(
  kind: "ordered" | "received",
  previous: string | null,
  next: string | null
) {
  const from = formatSheetDate(previous) || "—"
  const to = formatSheetDate(next) || "—"
  if (kind === "ordered") {
    if (!next) return `Cleared date ordered (${from})`
    if (!previous) return `Ordered on ${to}`
    return `Date ordered: ${from} → ${to}`
  }
  if (!next) return `Cleared date received (${from})`
  if (!previous) return `Received on ${to}`
  return `Date received: ${from} → ${to}`
}

function orderQtyReason(
  previous: number | null,
  next: number | null,
  unit: Unit
) {
  const from = previous === null ? "—" : `${formatNumber(previous)} ${unit}`
  const to = next === null ? "—" : `${formatNumber(next)} ${unit}`
  if (next === null) return `Cleared order quantity (${from})`
  if (previous === null) return `Ordered ${to}`
  return `Order quantity: ${from} → ${to}`
}

function receiveColorReason(color: ReceiveColor) {
  return color === "none" ? "Cleared receive color" : RECEIVE_COLOR_LABELS[color]
}

function sheetEditMovement(
  item: Pick<InventoryItem, "id" | "name" | "unit">,
  type: "order" | "status",
  reason: string,
  quantity = 0
): StockMovement {
  return {
    id: newId("mov"),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity,
    unit: item.unit,
    reason,
    createdAt: new Date().toISOString(),
  }
}

function garageBackupMovement(
  item: Pick<InventoryItem, "id" | "name" | "unit">,
  previous: number,
  nextQty: number
): StockMovement {
  return {
    id: newId("mov"),
    itemId: item.id,
    itemName: item.name,
    type: "count",
    quantity: nextQty,
    unit: item.unit,
    reason: `Garage backup: ${previous} → ${nextQty}`,
    createdAt: new Date().toISOString(),
  }
}

function itemSheetEditMovements(
  existing: InventoryItem,
  input: ItemInput
): StockMovement[] {
  const identity = { id: existing.id, name: input.name, unit: input.unit }
  const extra: StockMovement[] = []
  const nextOrderedOn = input.orderedOn || null
  const prevOrderedOn = existing.orderedOn || null
  if (dateKey(prevOrderedOn) !== dateKey(nextOrderedOn)) {
    extra.push(
      sheetEditMovement(
        identity,
        "order",
        dateChangeReason("ordered", prevOrderedOn, nextOrderedOn)
      )
    )
  }
  const prevQty = existing.orderedQty
  const nextQty = input.orderedQty ?? null
  if (prevQty !== nextQty) {
    extra.push(
      sheetEditMovement(
        identity,
        "order",
        orderQtyReason(prevQty, nextQty, input.unit),
        nextQty ?? 0
      )
    )
  }
  const nextReceivedOn = input.receivedOn || null
  const prevReceivedOn = existing.receivedOn || null
  if (dateKey(prevReceivedOn) !== dateKey(nextReceivedOn)) {
    extra.push(
      sheetEditMovement(
        identity,
        "status",
        dateChangeReason("received", prevReceivedOn, nextReceivedOn)
      )
    )
  }
  if (existing.receiveColor !== input.receiveColor) {
    extra.push(
      sheetEditMovement(
        identity,
        "status",
        receiveColorReason(input.receiveColor)
      )
    )
  }
  const nextGarage =
    Number.isFinite(input.garageQuantity) && input.garageQuantity >= 0
      ? input.garageQuantity
      : 0
  if (existing.garageQuantity !== nextGarage) {
    extra.push(garageBackupMovement(identity, existing.garageQuantity, nextGarage))
  }
  return extra
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeInventory,
    getInventorySnapshot,
    getServerInventorySnapshot
  )
  const ready = useSyncExternalStore(
    subscribeInventory,
    isInventoryReady,
    () => false
  )

  useEffect(() => {
    hydrateFromServer()
  }, [])

  const error = getInventoryError()
  const { items, movements } = snapshot

  const upsertItem = useCallback(
    (input: Omit<InventoryItem, "id" | "lastCountedAt"> & { id?: string }) => {
      const current = getInventorySnapshot()
      const existing = input.id
        ? current.items.find((item) => item.id === input.id)
        : undefined
      const itemsNext = input.id
        ? current.items.map((item) =>
            item.id === input.id
              ? {
                  ...item,
                  ...input,
                  id: item.id,
                  lastCountedAt: item.lastCountedAt,
                }
              : item
          )
        : [
            {
              ...input,
              id: newId("itm"),
              lastCountedAt: new Date().toISOString(),
            },
            ...current.items,
          ]
      const extra = existing ? itemSheetEditMovements(existing, input) : []
      writeInventory({
        items: itemsNext,
        movements: extra.length
          ? [...extra.reverse(), ...current.movements]
          : current.movements,
      })
      toast.success(input.id ? `Updated ${input.name}` : `Added ${input.name}`)
    },
    []
  )

  const setReceiveColor = useCallback((id: string, color: ReceiveColor) => {
    const current = getInventorySnapshot()
    const item = current.items.find((candidate) => candidate.id === id)
    if (!item || item.receiveColor === color) return
    writeInventory({
      items: current.items.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              receiveColor: color,
              receiveStatus: statusFromColor(color),
            }
          : candidate
      ),
      movements: [
        {
          id: newId("mov"),
          itemId: item.id,
          itemName: item.name,
          type: "status",
          quantity: 0,
          unit: item.unit,
          reason: receiveColorReason(color),
          createdAt: new Date().toISOString(),
        },
        ...current.movements,
      ],
    })
    toast.success(`${item.name}: ${RECEIVE_COLOR_LABELS[color]}`)
  }, [])

  const setFlavorSize = useCallback(
    (id: string, size: FlavorSize, quantity: number) => {
      const current = getInventorySnapshot()
      const item = current.items.find((candidate) => candidate.id === id)
      const nextQty = Number.isFinite(quantity) && quantity >= 0 ? quantity : 0
      if (!item || item.flavorSizes[size] === nextQty) return
      const previous = item.flavorSizes[size]
      writeInventory({
        items: current.items.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                flavorSizes: { ...candidate.flavorSizes, [size]: nextQty },
                lastCountedAt: new Date().toISOString(),
              }
            : candidate
        ),
        movements: [
          {
            id: newId("mov"),
            itemId: item.id,
            itemName: item.name,
            type: "count",
            quantity: nextQty,
            unit: item.unit,
            reason: `${FLAVOR_SIZE_LABELS[size]}: ${previous} → ${nextQty}`,
            createdAt: new Date().toISOString(),
          },
          ...current.movements,
        ],
      })
    },
    []
  )

  const setGarageQuantity = useCallback((id: string, quantity: number) => {
    const current = getInventorySnapshot()
    const item = current.items.find((candidate) => candidate.id === id)
    const nextQty = Number.isFinite(quantity) && quantity >= 0 ? quantity : 0
    if (!item || item.garageQuantity === nextQty) return
    const previous = item.garageQuantity
    writeInventory({
      items: current.items.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              garageQuantity: nextQty,
            }
          : candidate
      ),
      movements: [
        garageBackupMovement(item, previous, nextQty),
        ...current.movements,
      ],
    })
  }, [])

  const deleteItem = useCallback((id: string) => {
    const current = getInventorySnapshot()
    const item = current.items.find((candidate) => candidate.id === id)
    writeInventory({
      ...current,
      items: current.items.filter((candidate) => candidate.id !== id),
    })
    if (item) toast.success(`Removed ${item.name}`)
  }, [])

  const recordMovement = useCallback(
    (input: {
      itemId: string
      type: MovementType
      quantity: number
      reason: string
    }) => {
      if (input.quantity <= 0) {
        toast.error("Quantity must be greater than zero.")
        return
      }
      const current = getInventorySnapshot()
      const item = current.items.find((candidate) => candidate.id === input.itemId)
      if (!item) {
        toast.error("That item is no longer in inventory.")
        return
      }
      const note = input.reason.trim()
      const nextItem = applyMovement(item, input.type, input.quantity, {
        note,
      })
      writeInventory({
        items: current.items.map((candidate) =>
          candidate.id === item.id ? nextItem : candidate
        ),
        movements: [
          {
            id: newId("mov"),
            itemId: item.id,
            itemName: item.name,
            type: input.type,
            quantity: input.quantity,
            unit: item.unit,
            reason: note || MOVEMENT_LABELS[input.type],
            createdAt: new Date().toISOString(),
          },
          ...current.movements,
        ],
      })
      const verb =
        input.type === "receive"
          ? "Received"
          : input.type === "waste"
            ? "Logged waste for"
            : input.type === "count"
              ? "Counted"
              : input.type === "adjust"
                ? "Adjusted"
                : "Used"
      toast.success(`${verb} ${item.name}`)
    },
    []
  )

  const reset = useCallback(() => {
    restoreInventorySeed()
    toast.success("Reloaded the Nawabi Hyderabad House Greenwood and Kwality sheets.")
  }, [])

  const value = useMemo(
    () => ({
      error,
      items,
      movements,
      upsertItem,
      deleteItem,
      setReceiveColor,
      setFlavorSize,
      setGarageQuantity,
      recordMovement,
      reset,
    }),
    [
      deleteItem,
      error,
      items,
      movements,
      recordMovement,
      reset,
      setFlavorSize,
      setGarageQuantity,
      setReceiveColor,
      upsertItem,
    ]
  )

  if (!ready) {
    return (
      <div className="text-muted-foreground grid min-h-dvh place-items-center text-sm">
        Loading inventory…
      </div>
    )
  }

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const value = useContext(InventoryContext)
  if (!value) {
    throw new Error("useInventory must be used inside InventoryProvider.")
  }
  return value
}
