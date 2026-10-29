import type { StockStatus } from "@/lib/types"

const INDIANA_TZ = "America/Indiana/Indianapolis"

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNumber(value: number, digits = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: value % 1 === 0 ? 0 : digits,
  }).format(value)
}

function ordinal(day: number) {
  const teens = day % 100
  if (teens >= 11 && teens <= 13) return "th"
  switch (day % 10) {
    case 1:
      return "st"
    case 2:
      return "nd"
    case 3:
      return "rd"
    default:
      return "th"
  }
}

export function formatSheetDate(iso: string | null) {
  if (!iso) return ""
  const date = new Date(iso.includes("T") ? iso : `${iso}T12:00:00.000Z`)
  const day = date.getUTCDate()
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" })
  return `${day}${ordinal(day)} ${month}`
}

export function formatDate(iso: string) {
  const date = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`)
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: INDIANA_TZ,
  }).format(date)
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: INDIANA_TZ,
  }).format(new Date(iso))
}

export function daysUntil(iso: string | null, now = new Date()) {
  if (!iso) return null
  const target = new Date(`${iso}T12:00:00`)
  const start = new Date(now)
  start.setHours(12, 0, 0, 0)
  return Math.round((target.getTime() - start.getTime()) / 86_400_000)
}

export function stockStatus(
  quantity: number,
  reorderPoint: number,
  parLevel: number
): StockStatus {
  if (quantity <= 0 || quantity <= reorderPoint * 0.5) return "critical"
  if (quantity <= reorderPoint) return "low"
  if (parLevel > 0 && quantity > parLevel * 1.4) return "overstocked"
  return "ok"
}

export function suggestedOrderQty(
  quantity: number,
  parLevel: number,
  reorderPoint: number
) {
  if (quantity > reorderPoint) return 0
  return Math.max(0, Math.ceil((parLevel - quantity) * 10) / 10)
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`
}
