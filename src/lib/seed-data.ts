import type {
  Category,
  FlavorGroup,
  FlavorSizes,
  IceCreamListKind,
  InventoryItem,
  Location,
  ReceiveStatus,
  SheetKind,
  StockMovement,
  Unit,
} from "@/lib/types"
import { colorFromStatus, emptyFlavorSizes } from "@/lib/types"

export const RESTAURANT_NAME = "Nawabi Hyderabad House Greenwood"
export const STORAGE_KEY = "kwality-inventory-v2"

type Draft = {
  id: string
  name: string
  sku: string
  category: Category
  unit?: Unit
  quantity: number
  orderedQty?: number | null
  garageQuantity?: number
  parLevel?: number
  location?: Location
  supplier?: string
  orderedOn?: string
  receivedOn?: string
  receiveStatus?: ReceiveStatus
  receiveNote?: string
  extraNotes?: string
  iceCreamList?: IceCreamListKind
  flavorGroup?: FlavorGroup
  flavorSizes?: FlavorSizes
}

function isoNoon(date: string) {
  return `${date}T12:00:00.000Z`
}

function receiveStatusFromDraft(draft: Draft): ReceiveStatus {
  if (draft.receiveStatus) return draft.receiveStatus
  if (draft.receiveNote?.toLowerCase().includes("partial")) return "received-partial"
  if (draft.receivedOn || draft.receiveNote?.toLowerCase().includes("received")) {
    return "received-all"
  }
  if (draft.orderedOn) return "open"
  return "blank"
}

function orderedQtyFromDraft(draft: Draft): number | null {
  if (draft.orderedQty !== undefined) return draft.orderedQty
  if (draft.orderedOn || draft.receivedOn) return draft.parLevel ?? draft.quantity
  if (draft.quantity > 0) return draft.quantity
  return null
}

function buildItem(draft: Draft, sheet: SheetKind, serial: number): InventoryItem {
  const parLevel = draft.parLevel ?? Math.max(draft.quantity, 2)
  const receiveStatus = receiveStatusFromDraft(draft)
  const receiveNote = draft.receiveNote ?? ""
  const noteParts = [
    draft.orderedOn ? `Ordered ${draft.orderedOn}.` : null,
    receiveNote || (draft.receivedOn ? `Received ${draft.receivedOn}.` : null),
    draft.garageQuantity
      ? `${draft.garageQuantity} ${draft.unit ?? "case"} in garage backup.`
      : null,
    draft.extraNotes,
  ].filter(Boolean)

  return {
    id: draft.id,
    name: draft.name,
    sku: draft.sku,
    sheet,
    iceCreamList: draft.iceCreamList ?? "supplies",
    flavorGroup: draft.flavorGroup ?? "regular",
    flavorSizes: draft.flavorSizes ?? emptyFlavorSizes(),
    serial,
    category: draft.category,
    unit: draft.unit ?? "case",
    quantity: draft.quantity,
    orderedQty: orderedQtyFromDraft(draft),
    garageQuantity: draft.garageQuantity ?? 0,
    parLevel,
    reorderPoint: Math.max(1, Math.ceil(parLevel / 2)),
    unitCost: 0,
    supplier: draft.supplier ?? "House vendor",
    location: draft.location ?? "Front counter",
    orderedOn: draft.orderedOn ?? null,
    receivedOn: draft.receivedOn ?? null,
    receiveStatus,
    receiveColor: colorFromStatus(receiveStatus),
    receiveNote,
    expiresOn: null,
    lastCountedAt: isoNoon(draft.receivedOn ?? draft.orderedOn ?? "2026-10-28"),
    notes: noteParts.join(" "),
  }
}

const iceCreamDrafts: Draft[] = [
  {
    id: "ice-4oz-cups",
    name: "4 oz ice-cream cups",
    sku: "ICE-001",
    category: "ice-cream",
    quantity: 2,
    orderedOn: "2026-09-11",
    receivedOn: "2026-09-14",
    receiveNote: "Received all on 14th sept",
  },
  {
    id: "ice-4oz-lids",
    name: "4 oz ice-cream lids",
    sku: "ICE-002",
    category: "ice-cream",
    quantity: 2,
    garageQuantity: 2,
    orderedOn: "2026-03-16",
    receivedOn: "2026-03-20",
    receiveNote: "Received all on 20th march",
  },
  {
    id: "ice-8oz-cups",
    name: "8 oz regular ice-cream cups",
    sku: "ICE-003",
    category: "ice-cream",
    quantity: 2,
    orderedOn: "2026-03-16",
    receivedOn: "2026-03-18",
    receiveNote: "Received all on 18th march",
  },
  {
    id: "ice-8oz-lids",
    name: "8 oz regular ice-cream cup lids",
    sku: "ICE-004",
    category: "ice-cream",
    quantity: 2,
  },
  {
    id: "ice-sugar-cones",
    name: "sugar cones",
    sku: "ICE-005",
    category: "ice-cream",
    quantity: 0,
  },
  {
    id: "ice-waffle-small",
    name: "waffle cone small",
    sku: "ICE-006",
    category: "ice-cream",
    quantity: 0,
  },
  {
    id: "ice-waffle-large",
    name: "waffle cone large",
    sku: "ICE-007",
    category: "ice-cream",
    quantity: 0,
  },
  {
    id: "ice-number-candles",
    name: "Number Candles (2&3)",
    sku: "ICE-008",
    category: "party",
    unit: "each",
    quantity: 12,
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "ice-bday-toppers",
    name: "Happy Birthday Toppers",
    sku: "ICE-009",
    category: "party",
    unit: "pack",
    quantity: 0,
  },
  {
    id: "ice-regular-candles",
    name: "Regular Candles",
    sku: "ICE-010",
    category: "party",
    unit: "pack",
    quantity: 10,
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "ice-fanta",
    name: "Fanta",
    sku: "ICE-011",
    category: "beverages",
    unit: "case",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-plastic-plates",
    name: "Plastic plates",
    sku: "ICE-012",
    category: "disposables",
    quantity: 0,
  },
  {
    id: "ice-cutlery",
    name: "Cutlery",
    sku: "ICE-013",
    category: "disposables",
    quantity: 0,
  },
  {
    id: "ice-plastic-spoons",
    name: "Plastic spoons",
    sku: "ICE-014",
    category: "disposables",
    quantity: 3,
    orderedOn: "2026-10-19",
    receivedOn: "2026-10-22",
    receiveNote: "Received all on 22nd oct"
  },
  {
    id: "ice-tissues",
    name: "Tissues",
    sku: "ICE-015",
    category: "disposables",
    quantity: 0,
  },
  {
    id: "ice-2lb-boxes",
    name: "2 lb cake boxes",
    sku: "ICE-016",
    category: "packaging",
    unit: "box",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-4lb-boxes",
    name: "4 lb cake boxes",
    sku: "ICE-017",
    category: "packaging",
    unit: "box",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-4lb-square",
    name: "4 lb cake square boxes",
    sku: "ICE-018",
    category: "packaging",
    unit: "box",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-6lb-boxes",
    name: "6 lb cake boxes",
    sku: "ICE-019",
    category: "packaging",
    unit: "box",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-noodles",
    name: "Noodles",
    sku: "ICE-020",
    category: "dry-goods",
    unit: "case",
    quantity: 0,
    location: "Kitchen",
  },
  {
    id: "ice-ro-afza",
    name: "Ro Afza",
    sku: "ICE-021",
    category: "beverages",
    unit: "bottle",
    quantity: 0,
    location: "Dry storage",
  },
  {
    id: "ice-chia",
    name: "Chia seeds",
    sku: "ICE-022",
    category: "dry-goods",
    unit: "bag",
    quantity: 0,
    location: "Kitchen",
  },
  {
    id: "ice-falooda-cups",
    name: "Falooda cups",
    sku: "ICE-023",
    category: "ice-cream",
    quantity: 4,
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "ice-falooda-lids",
    name: "Falooda lids",
    sku: "ICE-024",
    category: "ice-cream",
    quantity: 4,
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "ice-ketchup",
    name: "Kechup sachets",
    sku: "ICE-025",
    category: "dry-goods",
    unit: "pack",
    quantity: 0,
    location: "Kitchen",
  },
  {
    id: "ice-tutti",
    name: "Tutti fruity cups",
    sku: "ICE-026",
    category: "ice-cream",
    quantity: 2,
    orderedOn: "2026-04-18",
    receivedOn: "2026-04-21",
    receiveNote: "Received all on 21st April"
  },
  {
    id: "ice-cookie-wrap",
    name: "Cookie wrapers",
    sku: "ICE-027",
    category: "packaging",
    unit: "pack",
    quantity: 2,
    orderedOn: "2026-04-18",
    receivedOn: "2026-04-21",
    receiveNote: "Received all on 21st April"
  },
  {
    id: "ice-delights",
    name: "Delights cups and lids",
    sku: "ICE-028",
    category: "ice-cream",
    quantity: 1,
    receivedOn: "2025-11-11",
    receiveNote: "Received 1 on 11th Nov"
  },
  {
    id: "ice-tasting-spoons",
    name: "Tasting spoons",
    sku: "ICE-029",
    category: "disposables",
    quantity: 4,
    orderedOn: "2026-05-13",
    receivedOn: "2026-05-15",
    receiveNote: "Received all on 15th May"
  },
  {
    id: "ice-falooda-straws",
    name: "Falooda straws",
    sku: "ICE-030",
    category: "disposables",
    quantity: 2,
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "ice-puff-bags",
    name: "Puff bags",
    sku: "ICE-031",
    category: "packaging",
    unit: "bag",
    quantity: 1,
    orderedOn: "2026-04-14",
    receivedOn: "2026-04-17",
    receiveNote: "Received all on 17th April"
  },
  {
    id: "ice-napkins",
    name: "Ice cream napkins",
    sku: "ICE-032",
    category: "disposables",
    quantity: 2,
    orderedOn: "2026-08-25",
    receivedOn: "2026-08-27",
    receiveNote: "Received all on 27th august"
  },
  {
    id: "ice-bathroom",
    name: "Bathroom rolls",
    sku: "ICE-033",
    category: "disposables",
    unit: "pack",
    quantity: 2,
    location: "Dry storage",
    orderedOn: "2026-06-21",
    receivedOn: "2026-06-23",
    receiveNote: "Received on 23rd June"
  },
]

const restaurantDrafts: Draft[] = [
  {
    id: "rst-16oz",
    name: "16 oz containers",
    sku: "RST-001",
    category: "packaging",
    quantity: 8,
    location: "Kitchen",
    orderedOn: "2026-10-22",
    receivedOn: "2026-10-26",
    receiveNote: "Received all on 26th oct"
  },
  {
    id: "rst-12oz",
    name: "12 oz containers",
    sku: "RST-002",
    category: "packaging",
    quantity: 2,
    location: "Kitchen",
    orderedOn: "2026-05-23",
    receivedOn: "2026-05-27",
    receiveNote: "Received all on 27th May"
  },
  {
    id: "rst-8oz",
    name: "8 oz containers",
    sku: "RST-003",
    category: "packaging",
    quantity: 8,
    location: "Kitchen",
    orderedOn: "2026-09-24",
    receivedOn: "2026-09-25",
    receiveNote: "Received all on 25th September"
  },
  {
    id: "rst-32oz",
    name: "32 oz containers",
    sku: "RST-004",
    category: "packaging",
    quantity: 3,
    location: "Kitchen",
  },
  {
    id: "rst-24oz-rice",
    name: "24 oz fried rice or noodles container",
    sku: "RST-005",
    category: "packaging",
    quantity: 4,
    location: "Kitchen",
    orderedOn: "2026-10-12",
    receivedOn: "2026-10-16",
    receiveNote: "Received all on 16th oct"
  },
  {
    id: "rst-16oz-apps",
    name: "16 oz appitizer boxes",
    sku: "RST-006",
    category: "packaging",
    unit: "box",
    quantity: 4,
    location: "Kitchen",
    orderedOn: "2026-10-15",
    receivedOn: "2026-10-19",
    receiveNote: "Received all on 19th oct",
  },
  {
    id: "rst-ticket-rolls",
    name: "Kitchen ticket rolls",
    sku: "RST-007",
    category: "ops",
    unit: "roll",
    quantity: 2,
    location: "Kitchen",
    orderedOn: "2026-10-22",
    receivedOn: "2026-10-26",
    receiveNote: "Received on 26th oct",
  },
  {
    id: "rst-ticket-cart",
    name: "Kitchen ticket catridge",
    sku: "RST-008",
    category: "ops",
    unit: "each",
    quantity: 1,
    location: "Kitchen",
    orderedOn: "2026-08-31",
    receivedOn: "2026-09-01",
    receiveNote: "Received on 1st sept",
  },
  {
    id: "rst-biryani-reg",
    name: "Biryani regular boxes",
    sku: "RST-009",
    category: "packaging",
    unit: "box",
    quantity: 10,
    location: "Kitchen",
    orderedOn: "2026-10-12",
    receivedOn: "2026-10-16",
    receiveNote: "Received all on 16th oct"
  },
  {
    id: "rst-biryani-fam",
    name: "Biryani family pack boxes",
    sku: "RST-010",
    category: "packaging",
    unit: "box",
    quantity: 5,
    garageQuantity: 3,
    location: "Kitchen",
    orderedOn: "2026-06-18",
    receivedOn: "2026-06-24",
    receiveNote: "Received all on 24th June",
  },
  {
    id: "rst-register",
    name: "Register rolls",
    sku: "RST-011",
    category: "ops",
    unit: "roll",
    quantity: 2,
    location: "Front counter",
    orderedOn: "2025-12-01",
    receivedOn: "2025-12-04",
    receiveNote: "Received all on 4th Dec",
  },
  {
    id: "rst-half-tray",
    name: "Half tray",
    sku: "RST-012",
    category: "packaging",
    unit: "each",
    quantity: 5,
    garageQuantity: 4,
    location: "Kitchen",
    orderedOn: "2026-09-03",
    receivedOn: "2026-09-10",
    receiveNote: "Received all on 10th September",
  },
  {
    id: "rst-med-tray",
    name: "Medium tray",
    sku: "RST-013",
    category: "packaging",
    unit: "each",
    quantity: 5,
    garageQuantity: 7,
    location: "Kitchen",
    orderedOn: "2026-05-28",
    receivedOn: "2026-06-02",
    receiveNote: "Received on 2nd june",
  },
  {
    id: "rst-full-tray",
    name: "Full tray",
    sku: "RST-014",
    category: "packaging",
    unit: "each",
    quantity: 5,
    garageQuantity: 7,
    location: "Kitchen",
    orderedOn: "2026-05-23",
    receivedOn: "2026-05-27",
    receiveNote: "Received all on 27th May"
  },
  {
    id: "rst-small-lids",
    name: "Small lids",
    sku: "RST-015",
    category: "packaging",
    quantity: 3,
    garageQuantity: 9,
    parLevel: 5,
    location: "Kitchen",
    orderedOn: "2026-10-28",
    receivedOn: "2026-10-31",
    orderedQty: 5,
    receiveStatus: "received-partial",
    receiveNote: "Received 3 on 31st Oct",
  },
  {
    id: "rst-full-lids",
    name: "Full lids",
    sku: "RST-016",
    category: "packaging",
    quantity: 5,
    garageQuantity: 7,
    location: "Kitchen",
    orderedOn: "2026-05-23",
    receivedOn: "2026-05-27",
    receiveNote: "Received all on 27th May"
  },
  {
    id: "rst-small-tray",
    name: "Small tray",
    sku: "RST-017",
    category: "packaging",
    unit: "each",
    quantity: 0,
    garageQuantity: 3,
    parLevel: 5,
    location: "Kitchen",
    orderedOn: "2026-10-28",
    extraNotes: "Ordered 5 on 28 Oct 2026. No receive logged yet.",
  },
  {
    id: "rst-4oz-cups",
    name: "4oz cups",
    sku: "RST-018",
    category: "packaging",
    quantity: 0,
    parLevel: 2,
    location: "Kitchen",
    orderedOn: "2026-10-27",
    extraNotes: "Ordered 2 on 27 Oct 2026. No receive logged yet.",
  },
  {
    id: "rst-4oz-lids",
    name: "4oz lids",
    sku: "RST-019",
    category: "packaging",
    quantity: 0,
    parLevel: 2,
    location: "Kitchen",
    orderedOn: "2026-10-27",
    extraNotes: "Ordered 2 on 27 Oct 2026. No receive logged yet.",
  },
  {
    id: "rst-gloves",
    name: "Gloves",
    sku: "RST-020",
    category: "ops",
    unit: "box",
    quantity: 2,
    location: "Kitchen",
    orderedOn: "2026-04-29",
    receivedOn: "2026-04-30",
    receiveNote: "Received all on 30th April",
  },
  {
    id: "rst-foil",
    name: "pop up foil",
    sku: "RST-021",
    category: "ops",
    unit: "box",
    quantity: 0,
    parLevel: 2,
    location: "Kitchen",
    orderedOn: "2026-10-27",
    extraNotes: "Ordered 2 on 27 Oct 2026. No receive logged yet.",
  },
]

const FLAVOR_NAMES: { group: FlavorGroup; names: string[] }[] = [
  {
    group: "regular",
    names: [
      "Beet Root Halwa",
      "Belgium Cookie Biscuit",
      "Black Currant",
      "Blue Mango",
      "Blueberry Cheese Cake",
      "Butter Pecan",
      "Butter Scotch",
      "Cashew Raisin",
      "Chikoo",
      "Chocolate",
      "Chocolate Supreme",
      "Coconut",
      "Cookie Dough",
      "Cookies & Cream",
      "Dubai Chocolate",
      "English Toffee",
      "Ferraro Roscher",
      "Fig Walnut",
      "Filter Caramel Coffee",
      "Guava",
      "Gulab Jamun",
      "Kesar Pista",
      "Kulfi Falooda",
      "Lychee",
      "Malai Kulfi",
      "Mango",
      "Mango Kulfi",
      "Mango Pomegranate",
      "Mava Kulfi",
      "Mint Chocolate Chip",
      "Mixed Jelley Dry Fruit",
      "Motichoor Ladu",
      "Orange Pineapple",
      "Paan Masala",
      "Pista",
      "Pista Kulfi",
      "Rajbhog",
      "Rose Icecream (Gulabo)",
      "Rum Raisin",
      "Sea Salt Caramel",
      "Sitafal",
      "Strawberry",
      "Strawberry Cheese Cake",
      "Strawberry Mango",
      "Thandai",
      "Tiramisu",
      "Tuttie Fruittie",
      "Vanilla",
      "Vanilla Chocolate Chip",
    ],
  },
  {
    group: "sugar-free",
    names: [
      "SF Cashew Raisin",
      "SF Fig Walnut",
      "SF Kesar Pista",
      "SF Pista",
      "SF Tuttie Fruittie",
    ],
  },
  {
    group: "logs",
    names: [
      "Cassatta Log",
      "Log – Kesar Pista Kulfi",
      "Log – Malai Kulfi",
      "Log – Mango Kulfi",
      "Log – Pista Kulfi",
      "Log – Rose Kulfi",
    ],
  },
]

function flavorSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

const flavorDrafts: Draft[] = FLAVOR_NAMES.flatMap((group) =>
  group.names.map((name) => ({
    id: `flavor-${flavorSlug(name)}`,
    name,
    sku: `FLV-${flavorSlug(name).slice(0, 12).toUpperCase()}`,
    category: "ice-cream" as Category,
    unit: "each" as Unit,
    quantity: 0,
    iceCreamList: "ice-creams" as IceCreamListKind,
    flavorGroup: group.group,
    flavorSizes: emptyFlavorSizes(),
    location: "Front counter" as Location,
  }))
).map((draft, index) => ({
  ...draft,
  sku: `FLV-${String(index + 1).padStart(3, "0")}`,
}))

export const SEED_ITEMS: InventoryItem[] = [
  ...iceCreamDrafts.map((draft, index) =>
    buildItem(draft, "ice-cream", index + 1)
  ),
  ...flavorDrafts.map((draft, index) =>
    buildItem(draft, "ice-cream", index + 1)
  ),
  ...restaurantDrafts.map((draft, index) =>
    buildItem(draft, "restaurant", index + 1)
  ),
]

function movement(
  id: string,
  itemId: string,
  itemName: string,
  quantity: number,
  unit: Unit,
  reason: string,
  createdAt: string
): StockMovement {
  return {
    id,
    itemId,
    itemName,
    type: "receive",
    quantity,
    unit,
    reason,
    createdAt,
  }
}

export const SEED_MOVEMENTS: StockMovement[] = [
  movement(
    "mov-small-lids",
    "rst-small-lids",
    "Small lids",
    3,
    "case",
    "Partial receive — 3 of 5",
    "2026-10-31T15:00:00.000Z"
  ),
  movement(
    "mov-16oz",
    "rst-16oz",
    "16 oz containers",
    8,
    "case",
    "Received all",
    "2026-10-26T15:00:00.000Z"
  ),
  movement(
    "mov-tickets",
    "rst-ticket-rolls",
    "Kitchen ticket rolls",
    2,
    "roll",
    "Received",
    "2026-10-26T15:10:00.000Z"
  ),
  movement(
    "mov-spoons",
    "ice-plastic-spoons",
    "Plastic spoons",
    3,
    "case",
    "Received all",
    "2026-10-22T15:00:00.000Z"
  ),
  movement(
    "mov-falooda-cups",
    "ice-falooda-cups",
    "Falooda cups",
    4,
    "case",
    "Received all",
    "2026-10-19T15:00:00.000Z"
  ),
  movement(
    "mov-falooda-lids",
    "ice-falooda-lids",
    "Falooda lids",
    4,
    "case",
    "Received all",
    "2026-10-19T15:10:00.000Z"
  ),
  movement(
    "mov-apps",
    "rst-16oz-apps",
    "16 oz appitizer boxes",
    4,
    "box",
    "Received all",
    "2026-10-19T15:20:00.000Z"
  ),
  movement(
    "mov-candles-n",
    "ice-number-candles",
    "Number Candles (2&3)",
    12,
    "each",
    "Received all — 12 of each",
    "2026-10-19T15:30:00.000Z"
  ),
  movement(
    "mov-candles-r",
    "ice-regular-candles",
    "Regular candles",
    10,
    "pack",
    "Received all",
    "2026-10-19T15:40:00.000Z"
  ),
  movement(
    "mov-straws",
    "ice-falooda-straws",
    "Falooda straws",
    2,
    "case",
    "Received all",
    "2026-10-19T15:50:00.000Z"
  ),
  movement(
    "mov-rice",
    "rst-24oz-rice",
    "24 oz fried rice or noodles container",
    4,
    "case",
    "Received all",
    "2026-10-16T15:00:00.000Z"
  ),
  movement(
    "mov-biryani",
    "rst-biryani-reg",
    "Biryani regular boxes",
    10,
    "box",
    "Received all",
    "2026-10-16T15:10:00.000Z"
  ),
]
