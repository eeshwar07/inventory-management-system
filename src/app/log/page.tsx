import type { Metadata } from "next"

import { MovementsView } from "@/components/movements-view"

export const metadata: Metadata = {
  title: "Activity",
}

export default function LogPage() {
  return <MovementsView />
}
