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

import { newId } from "@/lib/format"
import { applyMovement } from "@/lib/inventory"
import {
  getInventoryError,
  getInventorySnapshot,
  getServerInventorySnapshot,
  hydrateFromLocalStorage,
  restoreInventorySeed,
  subscribeInventory,
  writeInventory,
} from "@/lib/inventory-store"
import { RECEIVE_COLOR_LABELS, statusFromColor } from "@/lib/types"
import type {
  FlavorSize,
  InventoryItem,
  MovementType,
  ReceiveColor,
  StockMovement,
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
  recordMovement: (input: {
    itemId: string
    type: MovementType
    quantity: number
    reason: string
  }) => void
  reset: () => void
}

const InventoryContext = createContext<InventoryContextValue | null>(null)

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeInventory,
    getInventorySnapshot,
    getServerInventorySnapshot
  )

  useEffect(() => {
    hydrateFromLocalStorage()
  }, [])

  const error = getInventoryError()
  const { items, movements } = snapshot

  const upsertItem = useCallback(
    (input: Omit<InventoryItem, "id" | "lastCountedAt"> & { id?: string }) => {
      const current = getInventorySnapshot()
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
      writeInventory({ ...current, items: itemsNext })
      toast.success(input.id ? `Updated ${input.name}` : `Added ${input.name}`)
    },
    []
  )

  const setReceiveColor = useCallback((id: string, color: ReceiveColor) => {
    const current = getInventorySnapshot()
    const item = current.items.find((candidate) => candidate.id === id)
    if (!item) return
    writeInventory({
      ...current,
      items: current.items.map((candidate) =>
        candidate.id === id
          ? {
              ...candidate,
              receiveColor: color,
              receiveStatus: statusFromColor(color),
            }
          : candidate
      ),
    })
    toast.success(`${item.name}: ${RECEIVE_COLOR_LABELS[color]}`)
  }, [])

  const setFlavorSize = useCallback(
    (id: string, size: FlavorSize, quantity: number) => {
      const current = getInventorySnapshot()
      const nextQty = Number.isFinite(quantity) && quantity >= 0 ? quantity : 0
      writeInventory({
        ...current,
        items: current.items.map((item) =>
          item.id === id
            ? {
                ...item,
                flavorSizes: { ...item.flavorSizes, [size]: nextQty },
              }
            : item
        ),
      })
    },
    []
  )

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
      const nextItem = applyMovement(item, input.type, input.quantity)
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
            reason: input.reason,
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
      setReceiveColor,
      upsertItem,
    ]
  )

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
