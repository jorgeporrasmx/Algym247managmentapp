import { type NextRequest, NextResponse } from "next/server"
import { EmployeesService } from "@/lib/firebase/employees-service"

// GET /api/employees/[id] - Get a single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const employeesService = EmployeesService.getInstance()

    // Try to get by Firestore document ID first
    let employee = await employeesService.getEmployee(id)

    // If not found, try by employee_id (EMP001, etc.)
    if (!employee) {
      employee = await employeesService.getEmployeeByEmployeeId(id)
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[API] Get employee error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/employees/[id] - Update an employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const employeesService = EmployeesService.getInstance()

    // Check if employee exists
    let employee = await employeesService.getEmployee(id)
    let employeeId = id

    // If not found by document ID, try by employee_id
    if (!employee) {
      employee = await employeesService.getEmployeeByEmployeeId(id)
      if (employee) {
        employeeId = employee.id!
      }
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    const allowedFields = [
      'name', 'first_name', 'paternal_last_name', 'maternal_last_name',
      'email', 'primary_phone', 'secondary_phone', 'date_of_birth',
      'address_1', 'city', 'state', 'zip_code',
      'position', 'department', 'status', 'hire_date',
      'salary', 'access_level', 'manager', 'work_schedule',
      'skills', 'certifications', 'notes',
      'emergency_contact_name', 'emergency_contact_phone',
      'monday_item_id'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Parse salary if provided
    if (updateData.salary && typeof updateData.salary === 'string') {
      updateData.salary = parseFloat(updateData.salary as string)
    }

    await employeesService.updateEmployee(employeeId, updateData)

    // Get updated employee
    const updatedEmployee = await employeesService.getEmployee(employeeId)

    console.log("[API] Updated employee:", updatedEmployee)

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    })
  } catch (error) {
    console.error("[API] Update employee error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Delete an employee (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get("hard") === "true"

    const employeesService = EmployeesService.getInstance()

    // Check if employee exists
    let employee = await employeesService.getEmployee(id)
    let employeeId = id

    // If not found by document ID, try by employee_id
    if (!employee) {
      employee = await employeesService.getEmployeeByEmployeeId(id)
      if (employee) {
        employeeId = employee.id!
      }
    }

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "Employee not found" },
        { status: 404 }
      )
    }

    if (hard) {
      // Permanent delete
      await employeesService.hardDeleteEmployee(employeeId)
      console.log("[API] Hard deleted employee:", employeeId)
    } else {
      // Soft delete (change status to terminated)
      await employeesService.deleteEmployee(employeeId)
      console.log("[API] Soft deleted employee:", employeeId)
    }

    return NextResponse.json({
      success: true,
      message: hard ? "Employee permanently deleted" : "Employee terminated",
    })
  } catch (error) {
    console.error("[API] Delete employee error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
