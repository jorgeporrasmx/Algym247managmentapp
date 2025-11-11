import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const webhookType = searchParams.get("webhook_type")
    const status = searchParams.get("status")

    const offset = (page - 1) * limit

    let query = supabase.from("webhook_log").select("*", { count: "exact" }).order("processed_at", { ascending: false })

    if (webhookType) {
      query = query.eq("webhook_type", webhookType)
    }

    if (status) {
      query = query.eq("status", status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching webhook logs:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch webhook logs" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Webhook logs API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
