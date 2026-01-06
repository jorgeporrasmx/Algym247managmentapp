import { type NextRequest, NextResponse } from "next/server"
import { EmployeeAuthService } from "@/lib/firebase/employee-auth"
import { EmployeesService } from "@/lib/firebase/employees-service"
import { cookies } from "next/headers"
import { Permission, hasPermission, canManageEmployee, getAccessLevelFromString } from "@/lib/permissions"

// Session cookie configuration
const SESSION_COOKIE_NAME = 'employee_session'
const SESSION_MAX_AGE = 8 * 60 * 60 // 8 hours in seconds

// Helper to get current session from cookie
async function getCurrentSession() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  if (!sessionCookie) return null
  try {
    return JSON.parse(sessionCookie.value)
  } catch {
    return null
  }
}

// Helper to check if user can manage target employee
async function canManageTargetEmployee(sessionAccessLevel: string, targetEmployeeId: string): Promise<boolean> {
  const employeesService = EmployeesService.getInstance()
  const targetEmployee = await employeesService.getEmployee(targetEmployeeId)

  if (!targetEmployee) return false

  const sessionLevel = getAccessLevelFromString(sessionAccessLevel)
  const targetLevel = getAccessLevelFromString(targetEmployee.access_level || 'entrenador')

  // Check if user has general employee management permission
  const hasManageAll = hasPermission(sessionLevel, Permission.MANAGE_ALL_EMPLOYEES)
  const hasManageLower = hasPermission(sessionLevel, Permission.MANAGE_LOWER_EMPLOYEES)

  if (hasManageAll) return true
  if (hasManageLower) return canManageEmployee(sessionLevel, targetLevel)

  return false
}

// POST /api/auth/employee - Login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, action } = body

    const authService = EmployeeAuthService.getInstance()

    // Handle different actions
    if (action === 'create-credentials') {
      // Create credentials for an employee (requires management permission)
      const { employee_id, password: newPassword } = body

      // Verify caller has permission
      const session = await getCurrentSession()
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        )
      }

      const canManage = await canManageTargetEmployee(session.accessLevel, employee_id)
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: "Permission denied: cannot manage this employee" },
          { status: 403 }
        )
      }

      if (!employee_id || !newPassword) {
        return NextResponse.json(
          { success: false, error: "employee_id and password are required" },
          { status: 400 }
        )
      }

      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: "Password must be at least 8 characters" },
          { status: 400 }
        )
      }

      const result = await authService.createCredentials(employee_id, newPassword)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Login credentials created successfully"
      })
    }

    if (action === 'change-password') {
      // Change password
      const { current_password, new_password } = body

      if (!email || !current_password || !new_password) {
        return NextResponse.json(
          { success: false, error: "email, current_password, and new_password are required" },
          { status: 400 }
        )
      }

      if (new_password.length < 8) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 8 characters" },
          { status: 400 }
        )
      }

      const result = await authService.changePassword(email, current_password, new_password)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Password changed successfully"
      })
    }

    if (action === 'reset-password') {
      // Reset password (admin action - requires management permission)
      const { employee_id, new_password } = body

      // Verify caller has permission
      const session = await getCurrentSession()
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Authentication required" },
          { status: 401 }
        )
      }

      const canManage = await canManageTargetEmployee(session.accessLevel, employee_id)
      if (!canManage) {
        return NextResponse.json(
          { success: false, error: "Permission denied: cannot manage this employee" },
          { status: 403 }
        )
      }

      if (!employee_id || !new_password) {
        return NextResponse.json(
          { success: false, error: "employee_id and new_password are required" },
          { status: 400 }
        )
      }

      if (new_password.length < 8) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 8 characters" },
          { status: 400 }
        )
      }

      const result = await authService.resetPassword(employee_id, new_password)

      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: "Password reset successfully"
      })
    }

    // Default action: Login
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }

    const result = await authService.login(email, password)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      )
    }

    const { session } = result

    // Create session data for cookie
    const sessionData = {
      employeeId: session!.employee.id,
      email: session!.employee.email,
      name: session!.employee.name,
      accessLevel: session!.accessLevel,
      loginAt: session!.loginAt.toISOString()
    }

    // Set session cookie
    const cookieStore = await cookies()
    cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/'
    })

    console.log("[Auth] Employee logged in:", session!.employee.email)

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: session!.employee.id,
          employee_id: session!.employee.employee_id,
          name: session!.employee.name,
          email: session!.employee.email,
          position: session!.employee.position,
          department: session!.employee.department,
          access_level: session!.accessLevel
        },
        permissions: session!.permissions,
        loginAt: session!.loginAt.toISOString()
      }
    })
  } catch (error) {
    console.error("[Auth] Login error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// GET /api/auth/employee - Get current session
export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      )
    }

    const sessionData = JSON.parse(sessionCookie.value)

    // Verify employee still exists and is active
    const employeesService = EmployeesService.getInstance()
    const employee = await employeesService.getEmployee(sessionData.employeeId)

    if (!employee || employee.status !== 'active') {
      // Clear invalid session
      cookieStore.delete(SESSION_COOKIE_NAME)
      return NextResponse.json(
        { success: false, error: "Session invalid or employee deactivated" },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        employee: {
          id: employee.id,
          employee_id: employee.employee_id,
          name: employee.name,
          email: employee.email,
          position: employee.position,
          department: employee.department,
          access_level: employee.access_level
        },
        loginAt: sessionData.loginAt
      }
    })
  } catch (error) {
    console.error("[Auth] Session check error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/auth/employee - Logout
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(SESSION_COOKIE_NAME)

    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    })
  } catch (error) {
    console.error("[Auth] Logout error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
