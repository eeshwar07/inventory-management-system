import { Badge } from "@/components/ui/badge"
import { daysUntil, stockStatus } from "@/lib/format"
import type { InventoryItem, StockStatus } from "@/lib/types"
import { RECEIVE_COLOR_LABELS } from "@/lib/types"

const STOCK_COPY: Record<StockStatus, string> = {
  critical: "Critical",
  low: "Low",
  ok: "In range",
  overstocked: "Over par",
}

export function ReceiveBadge({ item }: { item: InventoryItem }) {
  const text =
    item.receiveNote.trim() ||
    (item.receiveColor === "green" ||
    item.receiveColor === "yellow" ||
    item.receiveColor === "red"
      ? RECEIVE_COLOR_LABELS[item.receiveColor]
      : "")
  if (!text) {
    return <span className="text-muted-foreground">—</span>
  }
  const color =
    item.receiveColor === "green"
      ? "border-emerald-300/80 bg-emerald-50 text-emerald-950"
      : item.receiveColor === "yellow"
        ? "border-amber-300/80 bg-amber-100 text-amber-950"
        : item.receiveColor === "red"
          ? "border-rose-300/80 bg-rose-50 text-rose-950"
          : "border-border bg-background text-foreground"
  return (
    <Badge variant="outline" className={`max-w-[16rem] truncate font-normal ${color}`}>
      {text}
    </Badge>
  )
}

export function StockBadge({ item }: { item: InventoryItem }) {
  const status = stockStatus(item.quantity, item.reorderPoint, item.parLevel)
  return (
    <Badge
      variant={
        status === "critical"
          ? "destructive"
          : status === "low"
            ? "secondary"
            : "outline"
      }
      className={
        status === "low"
          ? "border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100"
          : status === "overstocked"
            ? "border-sky-300/80 bg-sky-100 text-sky-950 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-100"
            : undefined
      }
    >
      {STOCK_COPY[status]}
    </Badge>
  )
}

export function ExpiryBadge({ item }: { item: InventoryItem }) {
  const days = daysUntil(item.expiresOn)
  if (days === null) {
    return <span className="text-muted-foreground">No date</span>
  }
  if (days < 0) {
    return <Badge variant="destructive">Expired</Badge>
  }
  if (days === 0) {
    return <Badge variant="destructive">Use today</Badge>
  }
  if (days <= 3) {
    return (
      <Badge
        variant="secondary"
        className="border-amber-300/80 bg-amber-100 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100"
      >
        {days === 1 ? "1 day" : `${days} days`}
      </Badge>
    )
  }
  return <span className="tabular-nums text-muted-foreground">{days}d</span>
}

export function StockMeter({ item }: { item: InventoryItem }) {
  const max = Math.max(item.parLevel, item.quantity, 1)
  const fill = Math.min(100, (item.quantity / max) * 100)
  const status = stockStatus(item.quantity, item.reorderPoint, item.parLevel)
  const fillClass =
    status === "critical"
      ? "bg-destructive"
      : status === "low"
        ? "bg-amber-500"
        : status === "overstocked"
          ? "bg-sky-600"
          : "bg-primary"

  return (
    <div className="flex min-w-28 flex-col gap-1">
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="text-[11px] tabular-nums text-muted-foreground">
        {item.quantity} / {item.parLevel} {item.unit}
      </p>
    </div>
  )
}
