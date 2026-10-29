"use client"

import { cn } from "cn"

import type { ReceiveColor } from "@/lib/types"
import { RECEIVE_COLOR_LABELS } from "@/lib/types"

const SWATCHES: { color: ReceiveColor; className: string }[] = [
  { color: "green", className: "bg-emerald-500" },
  { color: "yellow", className: "bg-amber-400" },
  { color: "red", className: "bg-rose-500" },
]

export function ReceiveColorPicker({
  value,
  onChange,
  size = "md",
}: {
  value: ReceiveColor
  onChange: (color: ReceiveColor) => void
  size?: "sm" | "md"
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Receive color"
      className="flex items-center gap-1.5"
    >
      {SWATCHES.map((swatch) => {
        const selected = value === swatch.color
        return (
          <button
            key={swatch.color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={RECEIVE_COLOR_LABELS[swatch.color]}
            title={RECEIVE_COLOR_LABELS[swatch.color]}
            onClick={() => onChange(selected ? "none" : swatch.color)}
            className={cn(
              "rounded-full border-2 border-white shadow-sm ring-1 ring-black/10 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              size === "sm" ? "size-4" : "size-5",
              swatch.className,
              selected ? "scale-110 ring-2 ring-foreground/70" : "opacity-70 hover:opacity-100"
            )}
          />
        )
      })}
    </div>
  )
}
