"use client"

import { useMemo, useState } from "react"

import { ErrorScreen, PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventory } from "@/components/inventory-provider"
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format"
import type { MovementType } from "@/lib/types"
import { MOVEMENT_LABELS, MOVEMENT_TYPES } from "@/lib/types"

export function MovementsView() {
  const { error, items, movements, reset } = useInventory()
  const [query, setQuery] = useState("")
  const [type, setType] = useState<MovementType | "all">("all")

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return movements.filter((movement) => {
      const matchesType = type === "all" || movement.type === type
      const matchesQuery =
        !needle ||
        movement.itemName.toLowerCase().includes(needle) ||
        movement.reason.toLowerCase().includes(needle)
      return matchesType && matchesQuery
    })
  }, [movements, query, type])

  if (error) return <ErrorScreen message={error} onReset={reset} />

  const wasteCost = movements
    .filter((movement) => movement.type === "waste")
    .reduce((sum, movement) => {
      const item = items.find((candidate) => candidate.id === movement.itemId)
      return sum + movement.quantity * (item?.unitCost ?? 0)
    }, 0)

  return (
    <div>
      <PageHeader
        title="Activity log"
        description="Receives from the order sheets, plus usage, waste, counts, and adjustments."
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Movements" value={String(movements.length)} />
        <Stat label="Waste cost (logged)" value={formatCurrency(wasteCost)} />
        <Stat
          label="Last entry"
          value={movements[0] ? formatDateTime(movements[0].createdAt) : "—"}
        />
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onValueChange={setQuery}
          placeholder="Search item or note"
          className="sm:flex-1"
        />
        <Select
          value={type}
          onValueChange={(value) => setType(value as MovementType | "all")}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {MOVEMENT_TYPES.map((movement) => (
              <SelectItem key={movement} value={movement}>
                {MOVEMENT_LABELS[movement]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-16 text-center">
          <h2 className="font-heading text-2xl">No activity yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Receive a delivery or log waste from the inventory list. The board stays
            empty until someone posts a movement.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center">
          <h2 className="font-heading text-xl">Nothing matches</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Try another search or movement type.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead className="hidden md:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((movement) => (
                <TableRow key={movement.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(movement.createdAt)}
                  </TableCell>
                  <TableCell className="font-medium">{movement.itemName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={movement.type === "waste" ? "destructive" : "outline"}
                    >
                      {MOVEMENT_LABELS[movement.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatNumber(movement.quantity)} {movement.unit}
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
                    {movement.reason || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-heading mt-1 text-xl tabular-nums">{value}</p>
    </div>
  )
}
