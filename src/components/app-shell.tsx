"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ScrollText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useInventory } from "@/components/inventory-provider"
import { IceCreamLogo, RestaurantLogo } from "@/components/brand-mark"
import { ICE_CREAM_BRAND, RESTAURANT_BRAND } from "@/lib/types"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/log", label: "Activity", icon: ScrollText },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { reset } = useInventory()

  return (
    <div className="flex min-h-full flex-1 bg-background">
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r bg-sidebar px-4 py-5 md:flex">
        <Link href="/" className="mb-8 flex flex-col gap-3 px-1">
          <span className="flex items-center gap-2.5">
            <RestaurantLogo size="md" />
            <span className="font-heading min-w-0 text-[15px] leading-tight">
              {RESTAURANT_BRAND}
            </span>
          </span>
          <span className="flex items-center gap-2.5">
            <IceCreamLogo size="md" />
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              {ICE_CREAM_BRAND}
            </span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <Button variant="outline" className="w-full" onClick={reset}>
          Reload sheet inventory
        </Button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <RestaurantLogo size="sm" />
            <IceCreamLogo size="sm" />
            <div className="min-w-0">
              <p className="font-heading truncate text-sm leading-tight">
                {RESTAURANT_BRAND}
              </p>
              <p className="text-muted-foreground truncate text-[11px]">
                {ICE_CREAM_BRAND}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground hidden text-sm md:block">
            Nawabi Hyderabad House Greenwood and Kwality Ice-cream sheets.
          </p>
          <Button variant="ghost" size="sm" className="hidden md:inline-flex" onClick={reset}>
            Reload sheets
          </Button>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-8 md:py-8 md:pb-8">
          {children}
        </main>

        <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t backdrop-blur md:hidden">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
