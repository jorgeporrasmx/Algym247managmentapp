import { type NextRequest, NextResponse } from "next/server"
import ScheduleService from "@/lib/firebase/schedule-service"
import MembersService from "@/lib/firebase/members-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get("member_id")

    if (!memberId) {
      return NextResponse.json({ success: false, error: "member_id is required" }, { status: 400 })
    }

    const bookings = await ScheduleService.getBookingsByMember(memberId)

    return NextResponse.json({
      success: true,
      data: bookings,
    })
  } catch (error) {
    console.error("[Firebase] Bookings API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { schedule_id, member_id } = body

    if (!schedule_id || !member_id) {
      return NextResponse.json({ success: false, error: "schedule_id and member_id are required" }, { status: 400 })
    }

    // Verify member exists
    const member = await MembersService.getMember(member_id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    const booking = await ScheduleService.createBooking({
      schedule_id,
      member_id,
      member_name: member.name,
      member_email: member.email,
      status: 'confirmed',
    })

    return NextResponse.json({
      success: true,
      data: booking,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error"
    console.error("[Firebase] Create booking API error:", error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
