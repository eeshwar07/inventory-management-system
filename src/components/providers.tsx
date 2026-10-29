"use client"

import { useEffect } from "react"

import { InventoryProvider } from "@/components/inventory-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hearth = "hydrated"
  }, [])

  return (
    <TooltipProvider delay={200}>
      <InventoryProvider>
        {children}
        <Toaster position="top-center" />
      </InventoryProvider>
    </TooltipProvider>
  )
}
