"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Package, TriangleAlert, Warehouse } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { ErrorScreen, PageHeader } from "@/components/page-header"
import { SheetTabs } from "@/components/sheet-tabs"
import { StockBadge } from "@/components/status-badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { useInventory } from "@/components/inventory-provider"
import { formatDateTime, formatNumber } from "@/lib/format"
import { computeMetrics, itemsForIceCreamList, itemsForSheet } from "@/lib/inventory"
import { MOVEMENT_LABELS, SHEET_LABELS } from "@/lib/types"
import type { SheetKind } from "@/lib/types"

const chartConfig = {
  value: { label: "On hand", color: "var(--primary)" },
} satisfies ChartConfig

export function DashboardView() {
  const { error, items, movements, reset } = useInventory()
  const [sheet, setSheet] = useState<SheetKind>("restaurant")

  const sheetCounts = useMemo(
    () => ({
      "ice-cream": itemsForSheet(items, "ice-cream").length,
      restaurant: itemsForSheet(items, "restaurant").length,
    }),
    [items]
  )
  const sheetItems = useMemo(
    () =>
      sheet === "ice-cream"
        ? itemsForIceCreamList(items, "supplies")
        : itemsForSheet(items, sheet),
    [items, sheet]
  )
  const sheetItemIds = useMemo(
    () => new Set(sheetItems.map((item) => item.id)),
    [sheetItems]
  )
  const sheetMovements = useMemo(
    () => movements.filter((movement) => sheetItemIds.has(movement.itemId)),
    [movements, sheetItemIds]
  )

  if (error) return <ErrorScreen message={error} onReset={reset} />

  const metrics = computeMetrics(sheetItems, sheetMovements)
  const recent = sheetMovements.slice(0, 6)

  return (
    <div>
      <PageHeader
        title="Morning board"
        description={
          sheet === "ice-cream"
            ? "Kwality supplies — cups, cones, cake boxes, and party items. Flavor tubs, pints, quat, and half are on Inventory → Ice-creams."
            : "Nawabi Hyderabad House Greenwood takeout trays, lids, biryani boxes, and tickets — including garage backup."
        }
        action={
          <Button nativeButton={false} render={<Link href="/inventory" />}>
            Open inventory
          </Button>
        }
      />

      <SheetTabs value={sheet} counts={sheetCounts} onChange={setSheet} />

      {metrics.outOfStockCount > 0 ? (
        <Alert variant="destructive" className="mb-6">
          <TriangleAlert />
          <AlertTitle>Need to order</AlertTitle>
          <AlertDescription>
            {metrics.outOfStockCount} SKU
            {metrics.outOfStockCount === 1 ? " is" : "s are"} at zero on the floor
            {metrics.outOfStock[0]
              ? `, including ${metrics.outOfStock
                  .slice(0, 3)
                  .map((item) => item.name)
                  .join(", ")}`
              : ""}
            .
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="SKUs tracked"
          value={String(metrics.totalSkus)}
          hint={SHEET_LABELS[sheet]}
          icon={Package}
        />
        <Kpi
          label="Out of stock"
          value={String(metrics.outOfStockCount)}
          hint="Nothing on the floor — check garage before ordering"
          icon={TriangleAlert}
        />
        <Kpi
          label="Below reorder"
          value={String(metrics.lowStockCount)}
          hint="At or under the last order quantity"
          icon={AlertTriangle}
        />
        <Kpi
          label="Garage backup"
          value={String(metrics.garageTotal)}
          hint="Cases sitting in the garage"
          icon={Warehouse}
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>On hand by category</CardTitle>
            <CardDescription>
              Floor stock from the {SHEET_LABELS[sheet].toLowerCase()} sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.byCategory.length === 0 ? (
              <EmptyChart />
            ) : (
              <ChartContainer
                config={chartConfig}
                className="aspect-[16/9] h-[260px] w-full min-h-[260px]"
              >
                <BarChart data={metrics.byCategory} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => String(value)}
                    width={48}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => formatNumber(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="value" fill="var(--color-value)" radius={6} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Suggested order</CardTitle>
            <CardDescription>
              Bring each item back to par. Review before you send the PO.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.reorder.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Nothing is under reorder point. Enjoy the lull.
              </p>
            ) : (
              metrics.reorder.slice(0, 6).map((row) => (
                <div
                  key={row.item.id}
                  className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{row.item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.item.supplier} · {row.item.location}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular-nums text-sm font-medium">
                      {formatNumber(row.qty)} {row.item.unit}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {row.item.garageQuantity > 0
                        ? `${formatNumber(row.item.garageQuantity)} in garage`
                        : "No garage backup"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Garage backup</CardTitle>
            <CardDescription>Pull these before placing a new order.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {metrics.garageItems.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No garage quantities were listed on the sheets.
              </p>
            ) : (
              metrics.garageItems.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Floor {formatNumber(item.quantity)} {item.unit}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatNumber(item.garageQuantity)} garage
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-start justify-between">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Receiving, usage, waste, and counts.</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href="/log" />}
            >
              Full log
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No movements yet. Receive a delivery or log a count.
              </p>
            ) : (
              recent.map((movement) => (
                <div key={movement.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{movement.itemName}</p>
                    <p className="text-muted-foreground text-xs">
                      {formatDateTime(movement.createdAt)}
                      {movement.reason ? ` · ${movement.reason}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {MOVEMENT_LABELS[movement.type]} {formatNumber(movement.quantity)}{" "}
                    {movement.unit}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Low stock</CardTitle>
          <CardDescription>Every SKU at or under its reorder point.</CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.lowStock.length === 0 ? (
            <p className="text-muted-foreground text-sm">Par is healthy across the board.</p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {metrics.lowStock.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.sku} · {item.supplier}
                    </p>
                  </div>
                  <StockBadge item={item} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <Icon className="size-3.5" />
          {label}
        </CardDescription>
        <CardTitle className="font-heading text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-xs">{hint}</CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="text-muted-foreground flex aspect-video items-center justify-center rounded-lg border border-dashed text-sm">
      Add items to see on-hand counts by category.
    </div>
  )
}
