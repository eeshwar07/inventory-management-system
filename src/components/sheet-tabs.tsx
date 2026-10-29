"use client"

import { IceCreamLogo, RestaurantLogo } from "@/components/brand-mark"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { SheetKind } from "@/lib/types"
import { SHEET_LABELS } from "@/lib/types"

export function SheetTabs({
  value,
  counts,
  onChange,
}: {
  value: SheetKind
  counts: Record<SheetKind, number>
  onChange: (sheet: SheetKind) => void
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next === "ice-cream" || next === "restaurant") onChange(next)
      }}
      className="mb-5 gap-0"
    >
      <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:max-w-2xl">
        <TabsTrigger
          value="restaurant"
          className="h-auto min-h-11 gap-2 px-2 py-1.5 text-left whitespace-normal"
        >
          <RestaurantLogo size="sm" />
          <span className="min-w-0 flex-1 leading-tight">
            {SHEET_LABELS.restaurant}
          </span>
          <Badge variant="secondary">{counts.restaurant}</Badge>
        </TabsTrigger>
        <TabsTrigger
          value="ice-cream"
          className="h-auto min-h-11 gap-2 px-2 py-1.5 text-left whitespace-normal"
        >
          <IceCreamLogo size="sm" />
          <span className="min-w-0 flex-1 leading-tight">
            {SHEET_LABELS["ice-cream"]}
          </span>
          <Badge variant="secondary">{counts["ice-cream"]}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
