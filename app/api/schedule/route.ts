import { type NextRequest, NextResponse } from "next/server"
import ScheduleService from "@/lib/firebase/schedule-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const classType = searchParams.get("class_type") || undefined
    const status = searchParams.get("status") || undefined
    const date = searchParams.get("date") || undefined

    const { items, hasMore } = await ScheduleService.listScheduleItems({
      pageSize: limit,
      classType,
      status,
      date
    })

    const stats = await ScheduleService.getStats()

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit),
        hasMore
      },
    })
  } catch (error) {
    console.error("[Firebase] Schedule API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { class_name, instructor, class_type, start_time, end_time, max_capacity = 20, status = "scheduled", description } = body

    if (!class_name || !class_type || !start_time || !end_time) {
      return NextResponse.json({ success: false, error: "Class name, type, start time, and end time are required" }, { status: 400 })
    }

    const scheduleItem = await ScheduleService.createScheduleItem({
      class_name,
      instructor,
      class_type,
      start_time,
      end_time,
      max_capacity: Number(max_capacity),
      status,
      description,
    })

    return NextResponse.json({
      success: true,
      data: scheduleItem,
    })
  } catch (error) {
    console.error("[Firebase] Create schedule API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
