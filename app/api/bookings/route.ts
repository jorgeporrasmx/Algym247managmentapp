import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const memberId = searchParams.get("member_id")
    const scheduleId = searchParams.get("schedule_id")
    const status = searchParams.get("status")

    const offset = (page - 1) * limit

    let query = supabase
      .from("bookings")
      .select(
        `
        *,
        members (
          id,
          name,
          email
        ),
        schedule (
          id,
          class_name,
          instructor,
          class_type,
          start_time,
          end_time,
          max_capacity,
          current_bookings
        )
      `,
        { count: "exact" },
      )
      .order("booking_date", { ascending: false })

    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    if (scheduleId) {
      query = query.eq("schedule_id", scheduleId)
    }

    if (status) {
      query = query.eq("status", status)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: bookings, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching bookings:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Bookings API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { schedule_id, member_id, status = "confirmed", notes } = body

    if (!schedule_id || !member_id) {
      return NextResponse.json({ success: false, error: "Schedule ID and member ID are required" }, { status: 400 })
    }

    // Verify schedule and member exist
    const { data: schedule, error: scheduleError } = await supabase
      .from("schedule")
      .select("id, class_name, max_capacity, current_bookings")
      .eq("id", schedule_id)
      .single()

    if (scheduleError || !schedule) {
      return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 })
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, name")
      .eq("id", member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Check if class is full
    if (schedule.current_bookings >= schedule.max_capacity) {
      return NextResponse.json({ success: false, error: "Class is full" }, { status: 400 })
    }

    // Check if member is already booked for this class
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("schedule_id", schedule_id)
      .eq("member_id", member_id)
      .eq("status", "confirmed")
      .single()

    if (existingBooking) {
      return NextResponse.json({ success: false, error: "Member is already booked for this class" }, { status: 400 })
    }

    // Create booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        schedule_id,
        member_id,
        status,
        notes,
      })
      .select(`
        *,
        members (
          id,
          name,
          email
        ),
        schedule (
          id,
          class_name,
          instructor,
          class_type,
          start_time,
          end_time,
          max_capacity,
          current_bookings
        )
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating booking:", error)
      return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 })
    }

    // Update current_bookings count
    await supabase
      .from("schedule")
      .update({ current_bookings: schedule.current_bookings + 1 })
      .eq("id", schedule_id)

    console.log("[v0] Created new booking:", booking)

    return NextResponse.json({
      success: true,
      data: booking,
    })
  } catch (error) {
    console.error("[v0] Create booking API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
