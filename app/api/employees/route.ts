import { type NextRequest, NextResponse } from "next/server"
import EmployeesService, { Employee } from "@/lib/firebase/employees-service"
import MondaySyncManager from "@/lib/monday/sync-manager"
import { isMondayEnabled } from "@/lib/monday/config"

/**
 * GET /api/employees
 * List employees with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const department = searchParams.get("department") || undefined
    const position = searchParams.get("position") || undefined

    const { employees, hasMore } = await EmployeesService.listEmployees({
      pageSize: limit,
      status,
      department,
      position
    })

    // Get stats
    const stats = await EmployeesService.getStats()

    return NextResponse.json({
      success: true,
      data: employees,
      pagination: {
        page,
        limit,
        total: stats.total,
        hasMore
      },
      stats: {
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        pending: stats.pending,
        byDepartment: stats.byDepartment,
        needingSync: stats.needingSync
      }
    })
  } catch (error) {
    console.error("[Employees API] Error fetching employees:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch employees"
    }, { status: 500 })
  }
}

/**
 * POST /api/employees
 * Create a new employee
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      first_name,
      paternal_last_name,
      maternal_last_name,
      email,
      primary_phone,
      secondary_phone,
      date_of_birth,
      address_1,
      city,
      state,
      zip_code,
      position,
      department,
      status = "pending",
      hire_date,
      access_level = "staff",
      salary,
      manager,
      work_schedule,
      skills,
      certifications,
      emergency_contact_name,
      emergency_contact_phone,
      notes
    } = body

    // Validate required fields
    if (!first_name || !paternal_last_name) {
      return NextResponse.json({
        success: false,
        error: "First name and paternal last name are required"
      }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({
        success: false,
        error: "Email is required"
      }, { status: 400 })
    }

    if (!primary_phone) {
      return NextResponse.json({
        success: false,
        error: "Primary phone is required"
      }, { status: 400 })
    }

    if (!position) {
      return NextResponse.json({
        success: false,
        error: "Position is required"
      }, { status: 400 })
    }

    // Generate employee ID
    const employeeId = `EMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    // Create employee in Firebase
    const employee = await EmployeesService.createEmployee({
      employee_id: employeeId,
      first_name,
      paternal_last_name,
      maternal_last_name,
      email,
      primary_phone,
      secondary_phone,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      address_1,
      city,
      state,
      zip_code,
      position,
      department: department || "general",
      status,
      hire_date: hire_date ? new Date(hire_date) : new Date(),
      access_level,
      salary: salary ? Number(salary) : undefined,
      manager,
      work_schedule,
      skills: skills || [],
      certifications: certifications || [],
      emergency_contact_name,
      emergency_contact_phone,
      notes
    })

    console.log("[Employees API] Created employee:", employee.id)

    // Trigger async sync to Monday if enabled
    if (isMondayEnabled() && employee.id) {
      MondaySyncManager.syncEmployeeToMonday(employee.id)
        .then(result => {
          if (result.success) {
            console.log("[Employees API] Synced to Monday:", result.mondayItemId)
          } else {
            console.error("[Employees API] Monday sync failed:", result.error)
          }
        })
        .catch(err => console.error("[Employees API] Monday sync error:", err))
    }

    return NextResponse.json({
      success: true,
      data: employee
    }, { status: 201 })
  } catch (error) {
    console.error("[Employees API] Error creating employee:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create employee"
    }, { status: 500 })
  }
}
