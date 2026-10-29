import {
  daysUntil,
  stockStatus,
  suggestedOrderQty,
} from "@/lib/format"
import type {
  Category,
  FlavorSizes,
  IceCreamListKind,
  InventoryItem,
  InventorySnapshot,
  MovementType,
  ReceiveColor,
  ReceiveStatus,
  SheetKind,
  StockMovement,
} from "@/lib/types"
import {
  CATEGORY_LABELS,
  colorFromStatus,
  emptyFlavorSizes,
  FLAVOR_GROUPS,
  ICE_CREAM_LISTS,
  RECEIVE_COLORS,
  RECEIVE_STATUSES,
  statusFromColor,
} from "@/lib/types"

export function inferReceiveColor(item: {
  receiveColor?: string
  receiveStatus?: string
  receiveNote?: string
  receivedOn?: string | null
  orderedOn?: string | null
}): ReceiveColor {
  if (RECEIVE_COLORS.includes(item.receiveColor as ReceiveColor)) {
    return item.receiveColor as ReceiveColor
  }
  return colorFromStatus(inferReceiveStatus(item))
}

export function inferSheet(item: {
  sheet?: string
  sku?: string
  id?: string
}): SheetKind {
  if (item.sheet === "ice-cream" || item.sheet === "restaurant") {
    return item.sheet
  }
  const sku = (item.sku ?? "").toUpperCase()
  const id = (item.id ?? "").toLowerCase()
  if (sku.startsWith("RST-") || id.startsWith("rst-")) return "restaurant"
  return "ice-cream"
}

export function itemsForSheet(items: InventoryItem[], sheet: SheetKind) {
  return items
    .filter((item) => item.sheet === sheet)
    .sort((a, b) => a.serial - b.serial || a.name.localeCompare(b.name))
}

export function inferIceCreamList(item: {
  iceCreamList?: string
  id?: string
  sku?: string
}): IceCreamListKind {
  if (ICE_CREAM_LISTS.includes(item.iceCreamList as IceCreamListKind)) {
    return item.iceCreamList as IceCreamListKind
  }
  const id = (item.id ?? "").toLowerCase()
  const sku = (item.sku ?? "").toUpperCase()
  if (id.startsWith("flavor-") || sku.startsWith("FLV-")) return "ice-creams"
  return "supplies"
}

export function inferFlavorSizes(value: InventoryItem["flavorSizes"] | undefined): FlavorSizes {
  const fallback = emptyFlavorSizes()
  if (!value) return fallback
  return {
    tubs: Number(value.tubs) || 0,
    pints: Number(value.pints) || 0,
    quat: Number(value.quat) || 0,
    half: Number(value.half) || 0,
  }
}

export function itemsForIceCreamList(
  items: InventoryItem[],
  list: IceCreamListKind
) {
  return itemsForSheet(items, "ice-cream")
    .filter((item) => inferIceCreamList(item) === list)
    .sort((a, b) => a.serial - b.serial || a.name.localeCompare(b.name))
}

export function inferReceiveStatus(item: {
  receiveStatus?: string
  receiveNote?: string
  receivedOn?: string | null
  orderedOn?: string | null
}): ReceiveStatus {
  if (RECEIVE_STATUSES.includes(item.receiveStatus as ReceiveStatus)) {
    return item.receiveStatus as ReceiveStatus
  }
  const note = (item.receiveNote ?? "").toLowerCase()
  if (note.includes("partial") || /received \d+/.test(note)) return "received-partial"
  if (item.receivedOn || note.includes("received")) return "received-all"
  if (item.orderedOn) return "open"
  return "blank"
}

export function nextSerial(
  items: InventoryItem[],
  sheet: SheetKind,
  list: IceCreamListKind = "supplies"
) {
  const pool =
    sheet === "ice-cream"
      ? itemsForIceCreamList(items, list)
      : itemsForSheet(items, sheet)
  const serials = pool.map((item) => item.serial)
  return (serials.length ? Math.max(...serials) : 0) + 1
}

export function itemValue(item: InventoryItem) {
  return item.quantity * item.unitCost
}

export function isExpiring(item: InventoryItem, withinDays = 3) {
  const days = daysUntil(item.expiresOn)
  return days !== null && days <= withinDays
}

export function isExpired(item: InventoryItem) {
  const days = daysUntil(item.expiresOn)
  return days !== null && days < 0
}

export function computeMetrics(
  items: InventoryItem[],
  movements: StockMovement[]
) {
  const totalSkus = items.length
  const onHandValue = items.reduce((sum, item) => sum + itemValue(item), 0)
  const lowStock = items.filter(
    (item) => stockStatus(item.quantity, item.reorderPoint, item.parLevel) !== "ok" &&
      stockStatus(item.quantity, item.reorderPoint, item.parLevel) !== "overstocked"
  )
  const critical = items.filter(
    (item) =>
      stockStatus(item.quantity, item.reorderPoint, item.parLevel) === "critical"
  )
  const expiring = items.filter((item) => isExpiring(item) || isExpired(item))
  const reorder = items
    .map((item) => ({
      item,
      qty: suggestedOrderQty(item.quantity, item.parLevel, item.reorderPoint),
      cost:
        suggestedOrderQty(item.quantity, item.parLevel, item.reorderPoint) *
        item.unitCost,
    }))
    .filter((row) => row.qty > 0)
    .sort((a, b) => b.cost - a.cost)

  const byCategory = (Object.keys(CATEGORY_LABELS) as Category[]).map(
    (category) => {
      const group = items.filter((item) => item.category === category)
      return {
        category,
        label: CATEGORY_LABELS[category],
        count: group.length,
        value: group.reduce((sum, item) => sum + item.quantity, 0),
      }
    }
  )

  const wasteCost = movements
    .filter((movement) => movement.type === "waste")
    .reduce((sum, movement) => {
      const item = items.find((candidate) => candidate.id === movement.itemId)
      return sum + movement.quantity * (item?.unitCost ?? 0)
    }, 0)

  const outOfStock = items.filter((item) => item.quantity <= 0)
  const garageItems = items
    .filter((item) => item.garageQuantity > 0)
    .sort((a, b) => b.garageQuantity - a.garageQuantity)
  const garageTotal = items.reduce((sum, item) => sum + item.garageQuantity, 0)

  return {
    totalSkus,
    onHandValue,
    lowStockCount: lowStock.length,
    criticalCount: critical.length,
    expiringCount: expiring.length,
    outOfStockCount: outOfStock.length,
    garageTotal,
    reorderCount: reorder.length,
    reorderCost: reorder.reduce((sum, row) => sum + row.cost, 0),
    wasteCost,
    byCategory: byCategory.filter((row) => row.count > 0),
    lowStock,
    outOfStock,
    garageItems,
    expiring: expiring.sort(
      (a, b) => (daysUntil(a.expiresOn) ?? 99) - (daysUntil(b.expiresOn) ?? 99)
    ),
    reorder,
  }
}

export function applyMovement(
  item: InventoryItem,
  type: MovementType,
  quantity: number
): InventoryItem {
  let nextQty = item.quantity
  if (type === "receive") nextQty += quantity
  if (type === "use" || type === "waste") nextQty = Math.max(0, nextQty - quantity)
  if (type === "adjust") nextQty = Math.max(0, nextQty + quantity)
  if (type === "count") nextQty = Math.max(0, quantity)

  const next: InventoryItem = {
    ...item,
    quantity: Math.round(nextQty * 100) / 100,
    lastCountedAt:
      type === "count" ? new Date().toISOString() : item.lastCountedAt,
  }

  if (type === "receive") {
    const ordered = item.orderedQty
    const color: ReceiveColor =
      ordered !== null && next.quantity < ordered ? "yellow" : "green"
    next.receiveColor = color
    next.receiveStatus = statusFromColor(color)
  }

  return next
}

export function parseSnapshot(raw: string | null): InventorySnapshot | null {
  if (!raw) return null
  const parsed = JSON.parse(raw) as InventorySnapshot
  if (!Array.isArray(parsed.items) || !Array.isArray(parsed.movements)) {
    throw new Error("Saved inventory is missing items or movements.")
  }
  return {
    items: parsed.items.map((item, index) => ({
      ...item,
      garageQuantity: item.garageQuantity ?? 0,
      sheet: inferSheet(item),
      iceCreamList: inferIceCreamList(item),
      flavorGroup: FLAVOR_GROUPS.includes(item.flavorGroup)
        ? item.flavorGroup
        : "regular",
      flavorSizes: inferFlavorSizes(item.flavorSizes),
      serial: item.serial ?? index + 1,
      orderedQty: item.orderedQty ?? null,
      orderedOn: item.orderedOn ?? null,
      receivedOn: item.receivedOn ?? null,
      receiveStatus: inferReceiveStatus(item),
      receiveColor: inferReceiveColor(item),
      receiveNote: item.receiveNote ?? "",
    })),
    movements: parsed.movements,
  }
}
