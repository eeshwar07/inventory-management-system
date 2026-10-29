export const SHEETS = ["ice-cream", "restaurant"] as const

export type SheetKind = (typeof SHEETS)[number]

export const ICE_CREAM_LISTS = ["supplies", "ice-creams"] as const

export type IceCreamListKind = (typeof ICE_CREAM_LISTS)[number]

export const FLAVOR_GROUPS = ["regular", "sugar-free", "logs"] as const

export type FlavorGroup = (typeof FLAVOR_GROUPS)[number]

export const FLAVOR_SIZES = ["tubs", "pints", "quat", "half"] as const

export type FlavorSize = (typeof FLAVOR_SIZES)[number]

export interface FlavorSizes {
  tubs: number
  pints: number
  quat: number
  half: number
}

export const CATEGORIES = [
  "ice-cream",
  "packaging",
  "party",
  "beverages",
  "dry-goods",
  "disposables",
  "ops",
] as const

export type Category = (typeof CATEGORIES)[number]

export const UNITS = [
  "case",
  "pack",
  "each",
  "box",
  "roll",
  "bag",
  "bottle",
] as const

export type Unit = (typeof UNITS)[number]

export const LOCATIONS = [
  "Front counter",
  "Kitchen",
  "Dry storage",
  "Garage",
] as const

export type Location = (typeof LOCATIONS)[number]

export const MOVEMENT_TYPES = [
  "receive",
  "use",
  "waste",
  "adjust",
  "count",
] as const

export type MovementType = (typeof MOVEMENT_TYPES)[number]

export const WASTE_REASONS = [
  "Damaged",
  "Wrong size",
  "Wet / unusable",
  "Opened extra case",
  "Guest return",
] as const

export const RECEIVE_STATUSES = [
  "received-all",
  "received-partial",
  "open",
  "blank",
] as const

export type ReceiveStatus = (typeof RECEIVE_STATUSES)[number]

export const RECEIVE_COLORS = ["green", "yellow", "red", "none"] as const

export type ReceiveColor = (typeof RECEIVE_COLORS)[number]

export interface InventoryItem {
  id: string
  name: string
  sku: string
  sheet: SheetKind
  iceCreamList: IceCreamListKind
  flavorGroup: FlavorGroup
  flavorSizes: FlavorSizes
  serial: number
  category: Category
  unit: Unit
  quantity: number
  orderedQty: number | null
  garageQuantity: number
  parLevel: number
  reorderPoint: number
  unitCost: number
  supplier: string
  location: Location
  orderedOn: string | null
  receivedOn: string | null
  receiveStatus: ReceiveStatus
  receiveColor: ReceiveColor
  receiveNote: string
  expiresOn: string | null
  lastCountedAt: string
  notes: string
}

export interface StockMovement {
  id: string
  itemId: string
  itemName: string
  type: MovementType
  quantity: number
  unit: Unit
  reason: string
  createdAt: string
}

export interface InventorySnapshot {
  items: InventoryItem[]
  movements: StockMovement[]
}

export type StockStatus = "critical" | "low" | "ok" | "overstocked"

export const ICE_CREAM_BRAND = "Kwality Ice-cream"
export const ICE_CREAM_LOGO_SRC = "/kwality-ice-cream-logo.jpg"
export const RESTAURANT_BRAND = "Nawabi Hyderabad House Greenwood"
export const RESTAURANT_LOGO_SRC = "/nawabi-hyderabad-house.jpg"

export const SHEET_LABELS: Record<SheetKind, string> = {
  "ice-cream": ICE_CREAM_BRAND,
  restaurant: RESTAURANT_BRAND,
}

export const ICE_CREAM_LIST_LABELS: Record<IceCreamListKind, string> = {
  supplies: "Supplies",
  "ice-creams": "Ice-creams",
}

export const FLAVOR_GROUP_LABELS: Record<FlavorGroup, string> = {
  regular: "Ice-creams",
  "sugar-free": "Sugar-Free",
  logs: "Kulfi-Logs",
}

export const FLAVOR_SIZE_LABELS: Record<FlavorSize, string> = {
  tubs: "Tubs",
  pints: "Pints",
  quat: "Quat",
  half: "Half",
}

export function emptyFlavorSizes(): FlavorSizes {
  return { tubs: 0, pints: 0, quat: 0, half: 0 }
}

export const RECEIVE_STATUS_LABELS: Record<ReceiveStatus, string> = {
  "received-all": "Received all",
  "received-partial": "Received partial",
  open: "Ordered",
  blank: "",
}

export const RECEIVE_COLOR_LABELS: Record<ReceiveColor, string> = {
  green: "Received all",
  yellow: "Received partial",
  red: "Did not receive anything",
  none: "No color",
}

export function colorFromStatus(status: ReceiveStatus): ReceiveColor {
  if (status === "received-all") return "green"
  if (status === "received-partial") return "yellow"
  if (status === "open") return "red"
  return "none"
}

export function statusFromColor(color: ReceiveColor): ReceiveStatus {
  if (color === "green") return "received-all"
  if (color === "yellow") return "received-partial"
  if (color === "red") return "open"
  return "blank"
}

export const RECEIVE_ROW_CLASS: Record<ReceiveColor, string> = {
  green: "bg-emerald-50 hover:bg-emerald-100/90",
  yellow: "bg-amber-50 hover:bg-amber-100/90",
  red: "bg-rose-50 hover:bg-rose-100/90",
  none: "",
}

export const CATEGORY_LABELS: Record<Category, string> = {
  "ice-cream": "Ice cream",
  packaging: "Takeout packaging",
  party: "Candles & toppers",
  beverages: "Beverages",
  "dry-goods": "Dry goods",
  disposables: "Disposables",
  ops: "Tickets & ops",
}

export const UNIT_LABELS: Record<Unit, string> = {
  case: "case",
  pack: "pack",
  each: "each",
  box: "box",
  roll: "roll",
  bag: "bag",
  bottle: "bottle",
}

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  receive: "Received",
  use: "Used",
  waste: "Waste",
  adjust: "Adjusted",
  count: "Counted",
}
