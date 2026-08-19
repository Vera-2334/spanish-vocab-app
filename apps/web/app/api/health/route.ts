import { NextResponse } from "next/server"
import { getDB, initDB } from "@/lib/db"

export async function GET() {
  try {
    await initDB()
    const db = getDB()
    const r = await db.execute("SELECT COUNT(*) as c FROM sync_words")
    return NextResponse.json({
      db: true,
      wordCount: r.rows[0].c,
      tursoUrl: process.env.TURSO_DATABASE_URL ? "set" : "missing",
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}