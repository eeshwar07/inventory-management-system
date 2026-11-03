import { connection } from "next/server"

import { resetInventory } from "@/lib/db"

export async function POST() {
  await connection()
  try {
    const snapshot = await resetInventory()
    return Response.json({ ...snapshot, pristine: false })
  } catch (error) {
    console.error(error)
    return Response.json(
      { error: "Could not reload the sheet inventory." },
      { status: 500 }
    )
  }
}
