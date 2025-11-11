import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const classType = searchParams.get("class_type")
    const status = searchParams.get("status")
    const date = searchParams.get("date")

    const offset = (page - 1) * limit

    let query = supabase
      .from("schedule")
      .select(
        `
        *,
        bookings (
          id,
          member_id,
          status,
          members (
            id,
            name,
            email
          )
        )
      `,
        { count: "exact" },
      )
      .order("start_time", { ascending: true })

    if (classType) {
      query = query.eq("class_type", classType)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (date) {
      const startOfDay = new Date(date)
      const endOfDay = new Date(date)
      endOfDay.setDate(endOfDay.getDate() + 1)
      
      query = query.gte("start_time", startOfDay.toISOString())
      query = query.lt("start_time", endOfDay.toISOString())
    }

    query = query.range(offset, offset + limit - 1)

    const { data: schedule, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching schedule:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch schedule" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: schedule,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Schedule API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { class_name, instructor, class_type, start_time, end_time, max_capacity = 20, status = "scheduled", description } = body

    if (!class_name || !class_type || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: "Class name, type, start time, and end time are required" }, { status: 400 })
    }

    const { data: scheduleItem, error } = await supabase
      .from("schedule")
      .insert({
        class_name,
        instructor,
        class_type,
        start_time,
        end_time,
        max_capacity: Number(max_capacity),
        status,
        description,
      })
      .select(`
        *,
        bookings (
          id,
          member_id,
          status,
          members (
            id,
            name,
            email
          )
        )
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating schedule item:", error)
      return NextResponse.json({ success: false, error: "Failed to create schedule item" }, { status: 500 })
    }

    console.log("[v0] Created new schedule item:", scheduleItem)

    return NextResponse.json({
      success: true,
      data: scheduleItem,
    })
  } catch (error) {
    console.error("[v0] Create schedule API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
