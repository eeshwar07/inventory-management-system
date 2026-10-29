"use client"

import { useMemo, useState } from "react"

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
import { useInventory } from "@/components/inventory-provider"
import type { InventoryItem, MovementType } from "@/lib/types"
import { MOVEMENT_LABELS, MOVEMENT_TYPES, WASTE_REASONS } from "@/lib/types"

export function StockDialog({
  open,
  onOpenChange,
  item,
  defaultType = "receive",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InventoryItem | null
  defaultType?: MovementType
}) {
  const { recordMovement } = useInventory()
  const [type, setType] = useState<MovementType>(defaultType)
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  const helper = useMemo(() => {
    if (!item) return ""
    if (type === "count") return `Currently ${item.quantity} ${item.unit} on hand.`
    if (type === "adjust")
      return "Use a positive number to add, negative to subtract."
    if (type === "waste") return "Waste hits food cost. Pick a reason."
    if (type === "use") return "Service, prep, or transfer off the shelf."
    return "Post a delivery or invoice against this SKU."
  }, [item, type])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!item) return
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty === 0) return
    recordMovement({
      itemId: item.id,
      type,
      quantity: type === "adjust" ? qty : Math.abs(qty),
      reason:
        type === "waste"
          ? reason.trim() || WASTE_REASONS[0]
          : reason.trim() || MOVEMENT_LABELS[type],
    })
    setQuantity("")
    setReason("")
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (next) {
          setType(defaultType)
          setQuantity("")
          setReason("")
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{item ? item.name : "Stock movement"}</DialogTitle>
            <DialogDescription>{helper}</DialogDescription>
          </DialogHeader>

          <label className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">Type</Label>
            <Select
              value={type}
              onValueChange={(value) => setType(value as MovementType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((movement) => (
                  <SelectItem key={movement} value={movement}>
                    {MOVEMENT_LABELS[movement]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="grid gap-1.5">
            <Label className="text-muted-foreground text-xs">
              Quantity {item ? `(${item.unit})` : ""}
            </Label>
            <Input
              autoFocus
              required
              type="number"
              step="0.1"
              value={quantity}
              onValueChange={setQuantity}
              placeholder={item ? String(item.parLevel) : "0"}
            />
          </label>

          {type === "waste" ? (
            <label className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">Waste reason</Label>
              <Select
                value={reason || WASTE_REASONS[0]}
                onValueChange={(value) => {
                  if (value) setReason(value)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WASTE_REASONS.map((waste) => (
                    <SelectItem key={waste} value={waste}>
                      {waste}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : (
            <label className="grid gap-1.5">
              <Label className="text-muted-foreground text-xs">Note</Label>
              <Input
                value={reason}
                onValueChange={setReason}
                placeholder="PO number, service, or count sheet"
              />
            </label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Post movement</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
