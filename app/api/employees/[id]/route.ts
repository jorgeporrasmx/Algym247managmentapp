import { type NextRequest, NextResponse } from "next/server"
import { EmployeesService } from "@/lib/firebase/employees-service"
import { requireAnyPermission, getAuthenticatedUser } from "@/lib/api-auth"
import { Permission, canManageEmployee, getAccessLevelFromString, AccessLevel } from "@/lib/permissions"

// GET /api/employees/[id] - Get a single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check authentication
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_EMPLOYEE_DETAILS,
      Permission.MANAGE_ALL_EMPLOYEES,
      Permission.MANAGE_LOWER_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

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

    // Check if user can view this employee based on hierarchy
    const targetLevel = getAccessLevelFromString(employee.access_level as string)
    const canView = canManageEmployee(authCheck.user!.access_level, targetLevel) ||
                    authCheck.user!.id === employee.id // Can always view own profile

    if (!canView) {
      // Return limited data for employees at higher level
      return NextResponse.json({
        success: true,
        data: {
          id: employee.id,
          name: employee.name,
          position: employee.position,
          department: employee.department,
          email: employee.email,
          status: employee.status
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[Employees] Get employee error:", error)
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

    // Check authentication
    const authCheck = await requireAnyPermission(request, [
      Permission.MANAGE_ALL_EMPLOYEES,
      Permission.MANAGE_LOWER_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

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

    // Check if user can manage this employee based on hierarchy
    const targetLevel = getAccessLevelFromString(employee.access_level as string)
    const canManage = canManageEmployee(authCheck.user!.access_level, targetLevel)

    if (!canManage) {
      return NextResponse.json(
        { success: false, error: "You cannot modify employees at or above your level" },
        { status: 403 }
      )
    }

    // Prevent changing access_level to a higher level than the manager
    if (body.access_level) {
      const newLevel = getAccessLevelFromString(body.access_level)
      if (!canManageEmployee(authCheck.user!.access_level, newLevel)) {
        return NextResponse.json(
          { success: false, error: "You cannot assign an access level higher than your own" },
          { status: 403 }
        )
      }
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

    console.log("[Employees] Updated by", authCheck.user?.email, ":", employee.employee_id)

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    })
  } catch (error) {
    console.error("[Employees] Update error:", error)
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

    // Check authentication - only MANAGE_ALL_EMPLOYEES can delete
    const authCheck = await requireAnyPermission(request, [
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

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

    // Check if user can delete this employee based on hierarchy
    const targetLevel = getAccessLevelFromString(employee.access_level as string)
    const canDelete = canManageEmployee(authCheck.user!.access_level, targetLevel)

    if (!canDelete) {
      return NextResponse.json(
        { success: false, error: "You cannot delete employees at or above your level" },
        { status: 403 }
      )
    }

    // Prevent deleting yourself
    if (authCheck.user!.id === employee.id) {
      return NextResponse.json(
        { success: false, error: "You cannot delete your own account" },
        { status: 403 }
      )
    }

    if (hard) {
      // Permanent delete - requires direccion level
      if (authCheck.user!.access_level !== AccessLevel.DIRECCION) {
        return NextResponse.json(
          { success: false, error: "Only Dirección can permanently delete employees" },
          { status: 403 }
        )
      }
      await employeesService.hardDeleteEmployee(employeeId)
      console.log("[Employees] Hard deleted by", authCheck.user?.email, ":", employee.employee_id)
    } else {
      // Soft delete (change status to terminated)
      await employeesService.deleteEmployee(employeeId)
      console.log("[Employees] Soft deleted by", authCheck.user?.email, ":", employee.employee_id)
    }

    return NextResponse.json({
      success: true,
      message: hard ? "Employee permanently deleted" : "Employee terminated",
    })
  } catch (error) {
    console.error("[Employees] Delete error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
