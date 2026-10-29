"use client"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { IceCreamListKind } from "@/lib/types"
import { ICE_CREAM_LIST_LABELS } from "@/lib/types"

export function IceCreamListTabs({
  value,
  counts,
  onChange,
}: {
  value: IceCreamListKind
  counts: Record<IceCreamListKind, number>
  onChange: (list: IceCreamListKind) => void
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (next === "supplies" || next === "ice-creams") onChange(next)
      }}
      className="mb-5 gap-0"
    >
      <TabsList className="grid h-auto w-full grid-cols-2 p-1 sm:max-w-md">
        <TabsTrigger value="supplies" className="h-auto min-h-10 gap-2 px-3">
          {ICE_CREAM_LIST_LABELS.supplies}
          <Badge variant="secondary">{counts.supplies}</Badge>
        </TabsTrigger>
        <TabsTrigger value="ice-creams" className="h-auto min-h-10 gap-2 px-3">
          {ICE_CREAM_LIST_LABELS["ice-creams"]}
          <Badge variant="secondary">{counts["ice-creams"]}</Badge>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
