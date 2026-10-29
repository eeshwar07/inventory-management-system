"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ReceiveColorPicker } from "@/components/receive-color-picker"
import { useInventory } from "@/components/inventory-provider"
import { nextSerial } from "@/lib/inventory"
import type {
  Category,
  FlavorGroup,
  IceCreamListKind,
  InventoryItem,
  Location,
  ReceiveColor,
  ReceiveStatus,
  SheetKind,
  Unit,
} from "@/lib/types"
import {
  CATEGORIES,
  CATEGORY_LABELS,
  emptyFlavorSizes,
  FLAVOR_GROUP_LABELS,
  FLAVOR_GROUPS,
  FLAVOR_SIZE_LABELS,
  FLAVOR_SIZES,
  ICE_CREAM_LIST_LABELS,
  ICE_CREAM_LISTS,
  LOCATIONS,
  RECEIVE_COLOR_LABELS,
  SHEETS,
  SHEET_LABELS,
  statusFromColor,
  UNITS,
} from "@/lib/types"

function emptyForm(sheet: SheetKind, list: IceCreamListKind) {
  return {
    name: "",
    sku: "",
    sheet,
    iceCreamList: list,
    flavorGroup: "regular" as FlavorGroup,
    flavorSizes: emptyFlavorSizes(),
    category: (sheet === "restaurant" ? "packaging" : "ice-cream") as Category,
    unit: "case" as Unit,
    quantity: "0",
    orderedQty: "",
    garageQuantity: "0",
    parLevel: "0",
    reorderPoint: "0",
    unitCost: "0",
    supplier: "",
    location: (sheet === "restaurant" ? "Kitchen" : "Front counter") as Location,
    orderedOn: "",
    receivedOn: "",
    receiveStatus: "blank" as ReceiveStatus,
    receiveColor: "none" as ReceiveColor,
    receiveNote: "",
    expiresOn: "",
    notes: "",
  }
}

function fromItem(item: InventoryItem) {
  return {
    name: item.name,
    sku: item.sku,
    sheet: item.sheet,
    iceCreamList: item.iceCreamList,
    flavorGroup: item.flavorGroup,
    flavorSizes: { ...item.flavorSizes },
    category: item.category,
    unit: item.unit,
    quantity: String(item.quantity),
    orderedQty: item.orderedQty === null ? "" : String(item.orderedQty),
    garageQuantity: String(item.garageQuantity),
    parLevel: String(item.parLevel),
    reorderPoint: String(item.reorderPoint),
    unitCost: String(item.unitCost),
    supplier: item.supplier,
    location: item.location,
    orderedOn: item.orderedOn ?? "",
    receivedOn: item.receivedOn ?? "",
    receiveStatus: item.receiveStatus,
    receiveColor: item.receiveColor,
    receiveNote: item.receiveNote,
    expiresOn: item.expiresOn ?? "",
    notes: item.notes,
  }
}

export function ItemFormDialog({
  open,
  onOpenChange,
  item,
  defaultSheet = "ice-cream",
  defaultList = "supplies",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item?: InventoryItem | null
  defaultSheet?: SheetKind
  defaultList?: IceCreamListKind
}) {
  const { items, upsertItem } = useInventory()
  const [form, setForm] = useState(() =>
    item ? fromItem(item) : emptyForm(defaultSheet, defaultList)
  )

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!form.name.trim() || !form.sku.trim()) return
    const orderedQty =
      form.orderedQty.trim() === "" ? null : Number(form.orderedQty)
    upsertItem({
      id: item?.id,
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      sheet: form.sheet,
      iceCreamList: form.sheet === "ice-cream" ? form.iceCreamList : "supplies",
      flavorGroup: form.flavorGroup,
      flavorSizes: form.flavorSizes,
      serial:
        item?.serial ??
        nextSerial(
          items,
          form.sheet,
          form.sheet === "ice-cream" ? form.iceCreamList : "supplies"
        ),
      category: form.category,
      unit: form.unit,
      quantity: Number(form.quantity) || 0,
      orderedQty: orderedQty === null || Number.isNaN(orderedQty) ? null : orderedQty,
      garageQuantity: Number(form.garageQuantity) || 0,
      parLevel: Number(form.parLevel) || 0,
      reorderPoint: Number(form.reorderPoint) || 0,
      unitCost: Number(form.unitCost) || 0,
      supplier: form.supplier.trim() || "Unassigned",
      location: form.location,
      orderedOn: form.orderedOn || null,
      receivedOn: form.receivedOn || null,
      receiveStatus: statusFromColor(form.receiveColor),
      receiveColor: form.receiveColor,
      receiveNote: form.receiveNote.trim(),
      expiresOn: form.expiresOn || null,
      notes: form.notes.trim(),
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{item ? "Edit item" : "Add inventory item"}</DialogTitle>
            <DialogDescription>
              Track a cup, lid, tray, or ticket on the{" "}
              {SHEET_LABELS[form.sheet].toLowerCase()} sheet.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <Input
                required
                value={form.name}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, name: value }))
                }
                placeholder="4 oz ice-cream cups"
              />
            </Field>
            <Field label="SKU">
              <Input
                required
                value={form.sku}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, sku: value }))
                }
                placeholder="ICE-001"
              />
            </Field>
            <Field label="Sheet">
              <Select
                value={form.sheet}
                onValueChange={(value) => {
                  if (value !== "ice-cream" && value !== "restaurant") return
                  setForm((current) => ({
                    ...current,
                    sheet: value,
                    iceCreamList:
                      value === "restaurant" ? "supplies" : current.iceCreamList,
                    category:
                      value === "restaurant" && current.category === "ice-cream"
                        ? "packaging"
                        : current.category,
                    location:
                      value === "restaurant" ? "Kitchen" : current.location,
                  }))
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHEETS.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {SHEET_LABELS[sheet]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.sheet === "ice-cream" ? (
              <Field label="Kwality list">
                <Select
                  value={form.iceCreamList}
                  onValueChange={(value) => {
                    if (value !== "supplies" && value !== "ice-creams") return
                    setForm((current) => ({
                      ...current,
                      iceCreamList: value,
                      category: "ice-cream",
                    }))
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICE_CREAM_LISTS.map((list) => (
                      <SelectItem key={list} value={list}>
                        {ICE_CREAM_LIST_LABELS[list]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            {form.sheet === "ice-cream" && form.iceCreamList === "ice-creams" ? (
              <Field label="Group">
                <Select
                  value={form.flavorGroup}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      flavorGroup: value as FlavorGroup,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLAVOR_GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {FLAVOR_GROUP_LABELS[group]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : null}
            <Field label="Category">
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, category: value as Category }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {form.sheet === "ice-cream" && form.iceCreamList === "ice-creams"
              ? FLAVOR_SIZES.map((size) => (
                  <Field key={size} label={FLAVOR_SIZE_LABELS[size]}>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={String(form.flavorSizes[size])}
                      onValueChange={(value) =>
                        setForm((current) => ({
                          ...current,
                          flavorSizes: {
                            ...current.flavorSizes,
                            [size]: Number(value) || 0,
                          },
                        }))
                      }
                    />
                  </Field>
                ))
              : null}
            <Field label="Unit">
              <Select
                value={form.unit}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, unit: value as Unit }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date ordered">
              <Input
                type="date"
                value={form.orderedOn}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, orderedOn: value }))
                }
              />
            </Field>
            <Field label="Sheet quantity">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.orderedQty}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, orderedQty: value }))
                }
                placeholder="As on the order sheet"
              />
            </Field>
            <Field label="On hand">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.quantity}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, quantity: value }))
                }
              />
            </Field>
            <Field label="Receive color">
              <div className="flex h-8 items-center gap-3">
                <ReceiveColorPicker
                  value={form.receiveColor}
                  onChange={(color) =>
                    setForm((current) => ({
                      ...current,
                      receiveColor: color,
                      receiveStatus: statusFromColor(color),
                    }))
                  }
                />
                <span className="text-muted-foreground text-xs">
                  {RECEIVE_COLOR_LABELS[form.receiveColor]}
                </span>
              </div>
            </Field>
            <Field label="Garage backup">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.garageQuantity}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    garageQuantity: value,
                  }))
                }
              />
            </Field>
            <Field label="Par">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.parLevel}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, parLevel: value }))
                }
              />
            </Field>
            <Field label="Reorder at">
              <Input
                type="number"
                min="0"
                step="0.1"
                value={form.reorderPoint}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, reorderPoint: value }))
                }
              />
            </Field>
            <Field label="Unit cost (USD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.unitCost}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, unitCost: value }))
                }
              />
            </Field>
            <Field label="Supplier">
              <Input
                value={form.supplier}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, supplier: value }))
                }
                placeholder="House vendor"
              />
            </Field>
            <Field label="Location">
              <Select
                value={form.location}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, location: value as Location }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Date received">
              <Input
                type="date"
                value={form.receivedOn}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, receivedOn: value }))
                }
              />
            </Field>
            <Field label="Expires">
              <Input
                type="date"
                value={form.expiresOn}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, expiresOn: value }))
                }
              />
            </Field>
          </div>
          <Field label="Status note">
            <Input
              value={form.receiveNote}
              onValueChange={(value) =>
                setForm((current) => ({ ...current, receiveNote: value }))
              }
              placeholder="Received all on 19th oct"
            />
          </Field>
          <Field label="Notes">
            <Textarea
              value={form.notes}
              onChange={(event) =>
                setForm((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Anything else about this SKU"
            />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{item ? "Save item" : "Add SKU"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5">
      <Label className="text-muted-foreground text-xs font-medium">{label}</Label>
      {children}
    </label>
  )
}
