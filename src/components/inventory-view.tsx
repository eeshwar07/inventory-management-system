"use client"

import { Fragment, useMemo, useState } from "react"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { cn } from "cn"

import { IceCreamListTabs } from "@/components/ice-cream-list-tabs"
import { ItemFormDialog } from "@/components/item-form-dialog"
import { ErrorScreen, PageHeader } from "@/components/page-header"
import { ReceiveColorPicker } from "@/components/receive-color-picker"
import { SheetBrand } from "@/components/brand-mark"
import { SheetTabs } from "@/components/sheet-tabs"
import { ReceiveBadge } from "@/components/status-badge"
import { StockDialog } from "@/components/stock-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useInventory } from "@/components/inventory-provider"
import { itemsForIceCreamList, itemsForSheet } from "@/lib/inventory"
import { formatNumber, formatSheetDate } from "@/lib/format"
import type {
  FlavorSize,
  IceCreamListKind,
  InventoryItem,
  MovementType,
  ReceiveColor,
  SheetKind,
} from "@/lib/types"
import {
  FLAVOR_GROUP_LABELS,
  FLAVOR_SIZE_LABELS,
  FLAVOR_SIZES,
  ICE_CREAM_LIST_LABELS,
  RECEIVE_COLOR_LABELS,
  RECEIVE_ROW_CLASS,
  SHEET_LABELS,
} from "@/lib/types"

type ColorFilter = "all" | ReceiveColor

const COLOR_FILTERS: {
  value: ColorFilter
  label: string
  dot?: string
}[] = [
  { value: "all", label: "All" },
  { value: "red", label: "Did not receive", dot: "bg-rose-500" },
  { value: "yellow", label: "Partial", dot: "bg-amber-400" },
  { value: "green", label: "Received all", dot: "bg-emerald-500" },
  { value: "none", label: "No color", dot: "bg-muted-foreground/40" },
]

export function InventoryView() {
  const { error, items, deleteItem, reset, setReceiveColor, setFlavorSize } =
    useInventory()
  const [query, setQuery] = useState("")
  const [colorFilter, setColorFilter] = useState<ColorFilter>("all")
  const [sheet, setSheet] = useState<SheetKind>("restaurant")
  const [iceCreamList, setIceCreamList] = useState<IceCreamListKind>("supplies")
  const [formOpen, setFormOpen] = useState(false)
  const [formSheet, setFormSheet] = useState<SheetKind>("restaurant")
  const [formList, setFormList] = useState<IceCreamListKind>("supplies")
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null)
  const [stockType, setStockType] = useState<MovementType>("receive")

  const sheetCounts = useMemo(
    () => ({
      restaurant: itemsForSheet(items, "restaurant").length,
      "ice-cream": itemsForSheet(items, "ice-cream").length,
    }),
    [items]
  )
  const iceCreamListCounts = useMemo(
    () => ({
      supplies: itemsForIceCreamList(items, "supplies").length,
      "ice-creams": itemsForIceCreamList(items, "ice-creams").length,
    }),
    [items]
  )
  const sheetItems = useMemo(() => {
    if (sheet === "ice-cream") return itemsForIceCreamList(items, iceCreamList)
    return itemsForSheet(items, sheet)
  }, [iceCreamList, items, sheet])
  const colorCounts = useMemo(() => {
    const counts: Record<ColorFilter, number> = {
      all: sheetItems.length,
      green: 0,
      yellow: 0,
      red: 0,
      none: 0,
    }
    for (const item of sheetItems) {
      counts[item.receiveColor] += 1
    }
    return counts
  }, [sheetItems])
  const visible = useMemo(
    () =>
      iceCreamList === "ice-creams" && sheet === "ice-cream"
        ? filterSheet(sheetItems, query, "all")
        : filterSheet(sheetItems, query, colorFilter),
    [colorFilter, iceCreamList, query, sheet, sheetItems]
  )
  const showingFlavors = sheet === "ice-cream" && iceCreamList === "ice-creams"

  function openAdd(nextSheet: SheetKind, list: IceCreamListKind = iceCreamList) {
    setEditing(null)
    setFormSheet(nextSheet)
    setFormList(nextSheet === "ice-cream" ? list : "supplies")
    setFormOpen(true)
  }

  function openStock(item: InventoryItem, type: MovementType) {
    setStockItem(item)
    setStockType(type)
  }

  if (error) return <ErrorScreen message={error} onReset={reset} />

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Switch between Nawabi Hyderabad House Greenwood and Kwality Ice-cream."
        action={
          <Button onClick={() => openAdd(sheet)}>
            <Plus data-icon="inline-start" />
            Add item
          </Button>
        }
      />

      <SheetTabs
        value={sheet}
        counts={sheetCounts}
        onChange={(next) => {
          setSheet(next)
          setFormSheet(next)
          if (next === "restaurant") setIceCreamList("supplies")
        }}
      />

      {sheet === "ice-cream" ? (
        <IceCreamListTabs
          value={iceCreamList}
          counts={iceCreamListCounts}
          onChange={setIceCreamList}
        />
      ) : null}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onValueChange={setQuery}
            placeholder={
              showingFlavors
                ? "Search ice-creams"
                : `Search ${SHEET_LABELS[sheet].toLowerCase()}`
            }
            className="pl-8"
          />
        </div>
      </div>

      {showingFlavors ? null : (
        <>
          <ColorFilterBar
            value={colorFilter}
            counts={colorCounts}
            onChange={setColorFilter}
          />
          <Legend />
        </>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="The inventory is empty"
          body="Reload the Nawabi Hyderabad House Greenwood and Kwality Ice-cream sheets, or add a SKU."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => openAdd(sheet)}>Add item</Button>
              <Button variant="outline" onClick={reset}>
                Reload sheet inventory
              </Button>
            </div>
          }
        />
      ) : showingFlavors ? (
        <FlavorList
          items={visible}
          total={sheetItems.length}
          query={query}
          onClearFilters={() => setQuery("")}
          onAdd={() => openAdd("ice-cream", "ice-creams")}
          onEdit={(item) => {
            setEditing(item)
            setFormSheet(item.sheet)
            setFormList("ice-creams")
            setFormOpen(true)
          }}
          onDelete={deleteItem}
          onSize={setFlavorSize}
        />
      ) : (
        <SheetList
          id={`${sheet}-sheet`}
          sheet={sheet}
          iceCreamList={iceCreamList}
          items={visible}
          total={sheetItems.length}
          query={query}
          colorFilter={colorFilter}
          onClearFilters={() => {
            setQuery("")
            setColorFilter("all")
          }}
          onAdd={() => openAdd(sheet)}
          onEdit={(item) => {
            setEditing(item)
            setFormSheet(item.sheet)
            setFormList(item.iceCreamList)
            setFormOpen(true)
          }}
          onStock={openStock}
          onDelete={deleteItem}
          onColor={setReceiveColor}
        />
      )}

      <ItemFormDialog
        key={`${formOpen}-${editing?.id ?? "create"}-${formSheet}-${formList}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
        defaultSheet={formSheet}
        defaultList={formList}
      />
      <StockDialog
        open={stockItem !== null}
        onOpenChange={(open) => {
          if (!open) setStockItem(null)
        }}
        item={stockItem}
        defaultType={stockType}
      />
    </div>
  )
}

function SheetList({
  id,
  sheet,
  iceCreamList,
  items,
  total,
  query,
  colorFilter,
  onClearFilters,
  onAdd,
  onEdit,
  onStock,
  onDelete,
  onColor,
}: {
  id: string
  sheet: SheetKind
  iceCreamList: IceCreamListKind
  items: InventoryItem[]
  total: number
  query: string
  colorFilter: ColorFilter
  onClearFilters: () => void
  onAdd: () => void
  onEdit: (item: InventoryItem) => void
  onStock: (item: InventoryItem, type: MovementType) => void
  onDelete: (id: string) => void
  onColor: (id: string, color: ReceiveColor) => void
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl tracking-tight">
            <SheetBrand sheet={sheet} size="lg" nameClassName="text-2xl" />
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {sheet === "ice-cream"
              ? `${ICE_CREAM_LIST_LABELS[iceCreamList]} · S.No, item, date ordered, quantity, status, and garage backup`
              : "S.No, item, date ordered, quantity, status, and garage backup"}
            {query.trim()
              ? ` · ${items.length} of ${total}`
              : ` · ${total} items`}
            {colorFilter !== "all"
              ? ` · ${RECEIVE_COLOR_LABELS[colorFilter].toLowerCase()} first`
              : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          Add to this sheet
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={query.trim() ? "No items match on this sheet" : `No ${SHEET_LABELS[sheet]} items`}
          body={
            query.trim()
              ? "Clear the search or color filter to see the full order sheet."
              : "Add a SKU to this sheet, or reload both order sheets."
          }
          action={
            query.trim() ? (
              <Button variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={onAdd}>Add item</Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Date ordered</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>In Garage (Backup)</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className={RECEIVE_ROW_CLASS[item.receiveColor]}
                >
                  <TableCell className="tabular-nums text-muted-foreground">
                    {item.serial}
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{item.name}</p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatSheetDate(item.orderedOn) || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {quantityLabel(item)}
                  </TableCell>
                  <TableCell>
                    <ReceiveBadge item={item} />
                  </TableCell>
                  <TableCell>
                    <ReceiveColorPicker
                      value={item.receiveColor}
                      onChange={(color) => onColor(item.id, color)}
                    />
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {item.garageQuantity > 0 ? (
                      formatNumber(item.garageQuantity)
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon-sm" />}
                      >
                        <MoreHorizontal />
                        <span className="sr-only">Item actions</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onStock(item, "receive")}>
                          Receive delivery
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStock(item, "use")}>
                          Log usage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStock(item, "waste")}>
                          Log waste
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onStock(item, "count")}>
                          Enter count
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          Edit item
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => onDelete(item.id)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function ColorFilterBar({
  value,
  counts,
  onChange,
}: {
  value: ColorFilter
  counts: Record<ColorFilter, number>
  onChange: (value: ColorFilter) => void
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      <p className="text-sm font-medium">Show first by color</p>
      <div
        role="group"
        aria-label="Filter by receive color"
        className="flex flex-wrap gap-2"
      >
        {COLOR_FILTERS.map((option) => {
          const selected = value === option.value
          return (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={selected ? "default" : "outline"}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className="gap-1.5"
            >
              {option.dot ? (
                <span className={cn("size-2.5 rounded-full", option.dot)} />
              ) : null}
              {option.label}
              <span className="tabular-nums opacity-80">{counts[option.value]}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="text-muted-foreground mb-6 flex flex-wrap gap-x-4 gap-y-1 text-xs">
      <span className="text-foreground/80 font-medium">
        Color meaning — tap green, yellow, or red on any row
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-emerald-600" />
        Received all
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-amber-500" />
        Received partial
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-rose-500" />
        Did not receive anything
      </span>
    </div>
  )
}

function quantityLabel(item: InventoryItem) {
  const qty = item.orderedQty
  if (qty === null || qty === undefined) {
    return <span className="text-muted-foreground">—</span>
  }
  if (item.unit === "each") return `${formatNumber(qty)} each`
  return formatNumber(qty)
}

function filterSheet(
  items: InventoryItem[],
  query: string,
  color: ColorFilter
) {
  const needle = query.trim().toLowerCase()
  const searched = !needle
    ? items
    : items.filter(
        (item) =>
          item.name.toLowerCase().includes(needle) ||
          item.sku.toLowerCase().includes(needle) ||
          item.receiveNote.toLowerCase().includes(needle) ||
          item.notes.toLowerCase().includes(needle)
      )
  if (color === "all") return searched
  return [...searched].sort((a, b) => {
    const aHit = a.receiveColor === color ? 0 : 1
    const bHit = b.receiveColor === color ? 0 : 1
    return aHit - bHit || a.serial - b.serial
  })
}

function FlavorList({
  items,
  total,
  query,
  onClearFilters,
  onAdd,
  onEdit,
  onDelete,
  onSize,
}: {
  items: InventoryItem[]
  total: number
  query: string
  onClearFilters: () => void
  onAdd: () => void
  onEdit: (item: InventoryItem) => void
  onDelete: (id: string) => void
  onSize: (id: string, size: FlavorSize, quantity: number) => void
}) {
  return (
    <section id="ice-creams-sheet" className="scroll-mt-20">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl tracking-tight">Ice-creams</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Product, tubs, pints, quat, and half
            {query.trim()
              ? ` · ${items.length} of ${total}`
              : ` · ${total} flavors`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <Plus data-icon="inline-start" />
          Add ice-cream
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title={query.trim() ? "No ice-creams match" : "No ice-creams on this list"}
          body={
            query.trim()
              ? "Clear the search to see the full Ice-creams list."
              : "Add a flavor, or reload the Kwality sheets."
          }
          action={
            query.trim() ? (
              <Button variant="outline" onClick={onClearFilters}>
                Clear search
              </Button>
            ) : (
              <Button onClick={onAdd}>Add ice-cream</Button>
            )
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table className="min-w-[40rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead>Product</TableHead>
                {FLAVOR_SIZES.map((size) => (
                  <TableHead key={size}>{FLAVOR_SIZE_LABELS[size]}</TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const prev = items[index - 1]
                const showGroup =
                  item.flavorGroup !== "regular" &&
                  item.flavorGroup !== prev?.flavorGroup
                return (
                  <Fragment key={item.id}>
                    {showGroup ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell
                          colSpan={7}
                          className="bg-muted/70 py-2 text-xs font-semibold tracking-wide uppercase"
                        >
                          {FLAVOR_GROUP_LABELS[item.flavorGroup]}
                        </TableCell>
                      </TableRow>
                    ) : null}
                    <TableRow key={item.id}>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {item.serial}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{item.name}</p>
                      </TableCell>
                      {FLAVOR_SIZES.map((size) => (
                        <TableCell key={size}>
                          <SizeCell
                            value={item.flavorSizes[size]}
                            onCommit={(quantity) => onSize(item.id, size, quantity)}
                            ariaLabel={`${item.name} ${FLAVOR_SIZE_LABELS[size]}`}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreHorizontal />
                            <span className="sr-only">Item actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(item)}>
                              Edit item
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => onDelete(item.id)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}

function SizeCell({
  value,
  onCommit,
  ariaLabel,
}: {
  value: number
  onCommit: (quantity: number) => void
  ariaLabel: string
}) {
  const [text, setText] = useState(value === 0 ? "" : String(value))

  return (
    <Input
      type="number"
      min="0"
      step="1"
      aria-label={ariaLabel}
      value={text}
      onValueChange={setText}
      onBlur={() => {
        const next = text.trim() === "" ? 0 : Number(text)
        const quantity = Number.isFinite(next) && next >= 0 ? next : 0
        setText(quantity === 0 ? "" : String(quantity))
        if (quantity !== value) onCommit(quantity)
      }}
      placeholder="—"
      className="h-8 w-20 tabular-nums"
    />
  )
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed px-6 py-16 text-center">
      <h2 className="font-heading text-2xl">{title}</h2>
      <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
