import { connection } from "next/server"

import { pingDatabase } from "@/lib/db"

export async function GET() {
  await connection()
  try {
    await pingDatabase()
    return Response.json({ ok: true })
  } catch (error) {
    console.error(error)
    return Response.json({ ok: false }, { status: 503 })
  }
}
