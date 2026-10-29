import type { ReactNode } from "react"
import Image from "next/image"
import { cn } from "cn"

import {
  ICE_CREAM_BRAND,
  ICE_CREAM_LOGO_SRC,
  RESTAURANT_BRAND,
  RESTAURANT_LOGO_SRC,
} from "@/lib/types"

const LOGO_PX = { sm: 28, md: 36, lg: 56 } as const
const LOGO_BOX = { sm: "size-7", md: "size-9", lg: "size-14" } as const
const ICE_CREAM_PX = {
  sm: { width: 88, height: 28 },
  md: { width: 112, height: 36 },
  lg: { width: 176, height: 56 },
} as const
const ICE_CREAM_BOX = {
  sm: "h-7 w-[5.5rem]",
  md: "h-9 w-28",
  lg: "h-14 w-44",
} as const

function BrandLogo({
  src,
  alt,
  size = "md",
  fit = "cover",
  className,
}: {
  src: string
  alt: string
  size?: keyof typeof LOGO_PX
  fit?: "cover" | "contain"
  className?: string
}) {
  const px = LOGO_PX[size]
  return (
    <Image
      src={src}
      alt={alt}
      width={px}
      height={px}
      className={cn(
        "shrink-0 rounded-md shadow-sm ring-1 ring-black/10",
        fit === "contain" ? "bg-white object-contain p-0.5" : "object-cover",
        LOGO_BOX[size],
        className
      )}
    />
  )
}

export function RestaurantLogo(props: {
  size?: keyof typeof LOGO_PX
  className?: string
}) {
  return (
    <BrandLogo
      src={RESTAURANT_LOGO_SRC}
      alt={RESTAURANT_BRAND}
      fit="cover"
      {...props}
    />
  )
}

export function IceCreamLogo({
  size = "md",
  className,
}: {
  size?: keyof typeof LOGO_PX
  className?: string
}) {
  const px = ICE_CREAM_PX[size]
  return (
    <Image
      src={ICE_CREAM_LOGO_SRC}
      alt={ICE_CREAM_BRAND}
      width={px.width}
      height={px.height}
      className={cn(
        "shrink-0 rounded-md bg-white object-contain p-1 shadow-sm ring-1 ring-black/10",
        ICE_CREAM_BOX[size],
        className
      )}
    />
  )
}

function BrandLockup({
  logo,
  name,
  size = "md",
  nameClassName,
}: {
  logo: ReactNode
  name: string
  size?: keyof typeof LOGO_PX
  nameClassName?: string
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      {logo}
      <span
        className={cn(
          "font-heading min-w-0 leading-tight",
          size === "sm" ? "text-xs" : size === "lg" ? "text-2xl" : "text-sm",
          nameClassName
        )}
      >
        {name}
      </span>
    </span>
  )
}

export function RestaurantBrand({
  size = "md",
  nameClassName,
}: {
  size?: keyof typeof LOGO_PX
  nameClassName?: string
}) {
  return (
    <BrandLockup
      logo={<RestaurantLogo size={size} />}
      name={RESTAURANT_BRAND}
      size={size}
      nameClassName={nameClassName}
    />
  )
}

export function IceCreamBrand({
  size = "md",
  nameClassName,
}: {
  size?: keyof typeof LOGO_PX
  nameClassName?: string
}) {
  return (
    <BrandLockup
      logo={<IceCreamLogo size={size} />}
      name={ICE_CREAM_BRAND}
      size={size}
      nameClassName={nameClassName}
    />
  )
}

export function SheetBrand({
  sheet,
  size = "md",
  nameClassName,
}: {
  sheet: "ice-cream" | "restaurant"
  size?: keyof typeof LOGO_PX
  nameClassName?: string
}) {
  return sheet === "restaurant" ? (
    <RestaurantBrand size={size} nameClassName={nameClassName} />
  ) : (
    <IceCreamBrand size={size} nameClassName={nameClassName} />
  )
}
