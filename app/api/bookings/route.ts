import { type NextRequest, NextResponse } from "next/server"
import { BookingsService, Booking } from "@/lib/firebase/bookings-service"
import { SchedulesService } from "@/lib/firebase/schedules-service"
import { MembersService } from "@/lib/firebase/members-service"
import { requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // Require authentication to view bookings
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const bookingsService = BookingsService.getInstance()
    const schedulesService = SchedulesService.getInstance()
    const membersService = MembersService.getInstance()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const memberId = searchParams.get("member_id") || undefined
    const scheduleId = searchParams.get("schedule_id") || undefined
    const status = searchParams.get("status") || undefined

    const { bookings, total } = await bookingsService.getBookings({
      page,
      limit,
      memberId,
      scheduleId,
      status
    })

    // Enrich bookings with member and schedule data
    const bookingsWithDetails = await Promise.all(
      bookings.map(async (booking) => {
        let member = null
        let schedule = null

        if (booking.member_id) {
          const memberData = await membersService.getMember(booking.member_id)
          if (memberData) {
            member = {
              id: memberData.id,
              name: memberData.name || `${memberData.first_name} ${memberData.paternal_last_name}`,
              email: memberData.email
            }
          }
        }

        if (booking.schedule_id) {
          const scheduleData = await schedulesService.getSchedule(booking.schedule_id)
          if (scheduleData) {
            schedule = {
              id: scheduleData.id,
              class_name: scheduleData.class_name,
              instructor: scheduleData.instructor,
              class_type: scheduleData.class_type,
              start_time: scheduleData.start_time,
              end_time: scheduleData.end_time,
              max_capacity: scheduleData.max_capacity,
              current_bookings: scheduleData.current_bookings
            }
          }
        }

        return {
          ...booking,
          members: member,
          schedule
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: bookingsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Bookings] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication to create bookings
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const bookingsService = BookingsService.getInstance()
    const schedulesService = SchedulesService.getInstance()
    const membersService = MembersService.getInstance()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid JSON in request body"
      }, { status: 400 })
    }

    const { schedule_id, member_id, status = "confirmed", notes } = body

    if (!schedule_id || !member_id) {
      return NextResponse.json(
        { success: false, error: "Schedule ID and member ID are required" },
        { status: 400 }
      )
    }

    // Verify schedule exists
    const schedule = await schedulesService.getSchedule(schedule_id)
    if (!schedule) {
      return NextResponse.json(
        { success: false, error: "Schedule not found" },
        { status: 404 }
      )
    }

    // Verify member exists
    const member = await membersService.getMember(member_id)
    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Check if class is full
    if (schedule.current_bookings >= schedule.max_capacity) {
      return NextResponse.json(
        { success: false, error: "Class is full" },
        { status: 400 }
      )
    }

    // Check if member is already booked for this class
    const existingBooking = await bookingsService.hasExistingBooking(schedule_id, member_id)
    if (existingBooking) {
      return NextResponse.json(
        { success: false, error: "Member is already booked for this class" },
        { status: 400 }
      )
    }

    // Create booking
    const bookingData: Omit<Booking, 'id' | 'booking_id' | 'booking_date' | 'created_at' | 'updated_at'> = {
      schedule_id,
      member_id,
      status,
      notes
    }

    const booking = await bookingsService.createBooking(bookingData)

    // Update current_bookings count in schedule
    await schedulesService.updateBookingCount(schedule_id, 1)

    console.log("[Bookings] Created new booking:", booking)

    // Return booking with member and schedule data
    const bookingWithDetails = {
      ...booking,
      members: {
        id: member.id,
        name: member.name || `${member.first_name} ${member.paternal_last_name}`,
        email: member.email
      },
      schedule: {
        id: schedule.id,
        class_name: schedule.class_name,
        instructor: schedule.instructor,
        class_type: schedule.class_type,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        max_capacity: schedule.max_capacity,
        current_bookings: schedule.current_bookings + 1
      }
    }

    return NextResponse.json({
      success: true,
      data: bookingWithDetails
    })
  } catch (error) {
    console.error("[Bookings] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
