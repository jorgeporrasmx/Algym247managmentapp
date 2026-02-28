import { type NextRequest, NextResponse } from "next/server"
import FirebaseEmployeesService from "@/lib/firebase/employees-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const search = searchParams.get("search") || undefined

    const result = await FirebaseEmployeesService.getEmployees({
      status,
      search,
      page,
      limit
    })

    return NextResponse.json({
      success: true,
      data: result.employees,
      pagination: {
        page: result.page,
        limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    console.error("[Firebase] Employees API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      name,
      position,
      status = "active",
      hire_date,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth,
      email,
      primary_phone,
      address_1,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      employee_id,
      salary,
      access_level,
      manager,
      work_schedule,
      skills,
      certifications,
      notes,
      version = "1.0"
    } = body

    if (!name && (!first_name || !paternal_last_name)) {
      return NextResponse.json({
        success: false,
        error: "Either name or both first_name and paternal_last_name are required"
      }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 })
    }

    if (!primary_phone) {
      return NextResponse.json({ success: false, error: "Primary phone is required" }, { status: 400 })
    }

    const generatedEmployeeId = employee_id || `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const employee = await FirebaseEmployeesService.createEmployee({
      name: name || `${first_name} ${paternal_last_name}`.trim(),
      position,
      status,
      hire_date,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth,
      email,
      primary_phone,
      address_1,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      employee_id: generatedEmployeeId,
      salary: salary ? parseFloat(salary) : undefined,
      access_level,
      manager,
      work_schedule,
      skills,
      certifications,
      notes,
      version
    })

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[Firebase] Create employee API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
