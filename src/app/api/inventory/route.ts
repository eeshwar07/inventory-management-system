import { connection } from "next/server"

import { readInventory, saveInventory } from "@/lib/db"
import { InventoryPayloadError, normalizeSnapshot } from "@/lib/inventory"

export async function GET() {
  await connection()
  try {
    const { snapshot, pristine } = await readInventory()
    return Response.json({ ...snapshot, pristine })
  } catch (error) {
    return inventoryErrorResponse(error, "Could not load inventory.")
  }
}

export async function PUT(request: Request) {
  await connection()
  try {
    const snapshot = normalizeSnapshot(await request.json())
    const saved = await saveInventory(snapshot)
    return Response.json({ ...saved, pristine: false })
  } catch (error) {
    return inventoryErrorResponse(error, "Could not save inventory.")
  }
}

function inventoryErrorResponse(error: unknown, fallback: string) {
  if (error instanceof InventoryPayloadError || error instanceof SyntaxError) {
    return Response.json({ error: error.message }, { status: 400 })
  }
  if (error instanceof Error && error.message.includes("DATABASE_URL")) {
    return Response.json({ error: error.message }, { status: 500 })
  }
  console.error(error)
  return Response.json({ error: fallback }, { status: 500 })
}
