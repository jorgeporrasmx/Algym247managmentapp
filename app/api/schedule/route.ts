import { type NextRequest, NextResponse } from "next/server"
import { SchedulesService, Schedule } from "@/lib/firebase/schedules-service"
import { BookingsService } from "@/lib/firebase/bookings-service"
import { MembersService } from "@/lib/firebase/members-service"

export async function GET(request: NextRequest) {
  try {
    const schedulesService = SchedulesService.getInstance()
    const bookingsService = BookingsService.getInstance()
    const membersService = MembersService.getInstance()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const classType = searchParams.get("class_type") || undefined
    const status = searchParams.get("status") || undefined
    const date = searchParams.get("date") || undefined

    const { schedules, total } = await schedulesService.getSchedules({
      page,
      limit,
      classType,
      status,
      date
    })

    // Enrich schedules with booking data
    const schedulesWithBookings = await Promise.all(
      schedules.map(async (schedule) => {
        const bookings = await bookingsService.getBookingsBySchedule(schedule.id!)

        // Get member details for each booking
        const bookingsWithMembers = await Promise.all(
          bookings.map(async (booking) => {
            let member = null
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
            return {
              id: booking.id,
              member_id: booking.member_id,
              status: booking.status,
              members: member
            }
          })
        )

        return {
          ...schedule,
          bookings: bookingsWithMembers
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: schedulesWithBookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Schedule] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const schedulesService = SchedulesService.getInstance()
    const body = await request.json()

    const {
      class_name,
      instructor,
      class_type,
      start_time,
      end_time,
      max_capacity = 20,
      status = "scheduled",
      description,
      location
    } = body

    if (!class_name || !class_type || !start_time || !end_time) {
      return NextResponse.json(
        { success: false, error: "Class name, type, start time, and end time are required" },
        { status: 400 }
      )
    }

    const scheduleData: Omit<Schedule, 'id' | 'schedule_id' | 'current_bookings' | 'created_at' | 'updated_at'> = {
      class_name,
      instructor,
      class_type,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      max_capacity: Number(max_capacity),
      status,
      description,
      location
    }

    const schedule = await schedulesService.createSchedule(scheduleData)

    console.log("[Schedule] Created new schedule item:", schedule)

    return NextResponse.json({
      success: true,
      data: {
        ...schedule,
        bookings: []
      }
    })
  } catch (error) {
    console.error("[Schedule] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
