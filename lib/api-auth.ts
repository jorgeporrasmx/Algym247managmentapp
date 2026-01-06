import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { EmployeesService } from "@/lib/firebase/employees-service"
import { AccessLevel, Permission, hasPermission, getAccessLevelFromString } from "@/lib/permissions"

export interface AuthenticatedUser {
  id: string
  employee_id: string
  email: string
  name: string
  access_level: AccessLevel
  permissions: Permission[]
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
}

/**
 * Get the currently authenticated user from the session cookie
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("employee_session")

    if (!sessionCookie?.value) {
      return { success: false, error: "No session found" }
    }

    // Parse the session data
    let sessionData: { employee_id: string; timestamp: number }
    try {
      sessionData = JSON.parse(sessionCookie.value)
    } catch {
      return { success: false, error: "Invalid session format" }
    }

    // Check session expiry (24 hours)
    const SESSION_DURATION = 24 * 60 * 60 * 1000
    if (Date.now() - sessionData.timestamp > SESSION_DURATION) {
      return { success: false, error: "Session expired" }
    }

    // Get employee data
    const employeesService = EmployeesService.getInstance()
    const employee = await employeesService.getEmployee(sessionData.employee_id)

    if (!employee) {
      return { success: false, error: "Employee not found" }
    }

    if (employee.status !== "active") {
      return { success: false, error: "Employee account is not active" }
    }

    const accessLevel = getAccessLevelFromString(employee.access_level as string)

    return {
      success: true,
      user: {
        id: employee.id!,
        employee_id: employee.employee_id,
        email: employee.email,
        name: employee.name,
        access_level: accessLevel,
        permissions: getPermissionsForLevel(accessLevel)
      }
    }
  } catch (error) {
    console.error("[Auth] Error getting authenticated user:", error)
    return { success: false, error: "Authentication error" }
  }
}

/**
 * Get all permissions for a given access level
 */
function getPermissionsForLevel(level: AccessLevel): Permission[] {
  const allPermissions = Object.values(Permission)
  return allPermissions.filter(p => hasPermission(level, p))
}

/**
 * Check if request has a required permission
 * Returns 401 if not authenticated, 403 if not authorized
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<{ authorized: boolean; user?: AuthenticatedUser; response?: NextResponse }> {
  const authResult = await getAuthenticatedUser(request)

  if (!authResult.success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: authResult.error || "Authentication required" },
        { status: 401 }
      )
    }
  }

  const user = authResult.user!

  if (!hasPermission(user.access_level, permission)) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }
  }

  return { authorized: true, user }
}

/**
 * Check if request has one of multiple required permissions
 */
export async function requireAnyPermission(
  request: NextRequest,
  permissions: Permission[]
): Promise<{ authorized: boolean; user?: AuthenticatedUser; response?: NextResponse }> {
  const authResult = await getAuthenticatedUser(request)

  if (!authResult.success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: authResult.error || "Authentication required" },
        { status: 401 }
      )
    }
  }

  const user = authResult.user!
  const hasAnyPermission = permissions.some(p => hasPermission(user.access_level, p))

  if (!hasAnyPermission) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient permissions" },
        { status: 403 }
      )
    }
  }

  return { authorized: true, user }
}

/**
 * Check if request has a minimum access level
 */
export async function requireAccessLevel(
  request: NextRequest,
  minLevel: AccessLevel
): Promise<{ authorized: boolean; user?: AuthenticatedUser; response?: NextResponse }> {
  const authResult = await getAuthenticatedUser(request)

  if (!authResult.success) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: authResult.error || "Authentication required" },
        { status: 401 }
      )
    }
  }

  const user = authResult.user!

  // Check hierarchy
  const ACCESS_HIERARCHY: Record<AccessLevel, number> = {
    [AccessLevel.DIRECCION]: 1,
    [AccessLevel.GERENTE]: 2,
    [AccessLevel.VENTAS]: 3,
    [AccessLevel.RECEPCIONISTA]: 4,
    [AccessLevel.ENTRENADOR]: 5
  }

  const userHierarchy = ACCESS_HIERARCHY[user.access_level]
  const requiredHierarchy = ACCESS_HIERARCHY[minLevel]

  if (userHierarchy > requiredHierarchy) {
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: "Insufficient access level" },
        { status: 403 }
      )
    }
  }

  return { authorized: true, user }
}

/**
 * Wrapper for API routes that require authentication
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const authResult = await getAuthenticatedUser(request)

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Authentication required" },
        { status: 401 }
      )
    }

    return handler(request, authResult.user!)
  }
}

/**
 * Wrapper for API routes that require specific permission
 */
export function withPermission(
  permission: Permission,
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const result = await requirePermission(request, permission)

    if (!result.authorized) {
      return result.response!
    }

    return handler(request, result.user!)
  }
}
