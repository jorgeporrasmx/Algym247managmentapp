import { useEffect, useState } from 'react'
import { AccessLevel, Permission, hasPermission, canManageEmployee, getAccessLevelFromString } from '@/lib/permissions'

interface EmployeeSession {
  id: string
  name: string
  email: string
  position: string
  department: string
  access_level: string
  employee_type: string
  username: string
  last_login: string | null
}

interface PermissionsContext {
  userLevel: AccessLevel | null
  loading: boolean
  employee: EmployeeSession | null
  hasPermission: (permission: Permission) => boolean
  canManageEmployee: (targetLevel: AccessLevel) => boolean
  canViewFinancialInfo: () => boolean
  canManageInventory: () => boolean
  canEditMembers: () => boolean
  canApplyDiscounts: () => boolean
}

export function usePermissions(): PermissionsContext {
  const [userLevel, setUserLevel] = useState<AccessLevel | null>(null)
  const [employee, setEmployee] = useState<EmployeeSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for employee session in localStorage
    if (typeof window !== 'undefined') {
      try {
        // First check for employee session
        const employeeSessionStr = localStorage.getItem("employeeSession")
        if (employeeSessionStr) {
          const employeeSession: EmployeeSession = JSON.parse(employeeSessionStr)
          setEmployee(employeeSession)
          setUserLevel(getAccessLevelFromString(employeeSession.access_level))
          setLoading(false)
          return
        }

        // Then check for dev session and convert to employee format
        const devSessionStr = localStorage.getItem("devSession")
        if (devSessionStr) {
          const devSession = JSON.parse(devSessionStr)
          if (devSession && devSession.user) {
            // Convert dev session to employee format with admin access
            const adminEmployee: EmployeeSession = {
              id: devSession.user.id,
              name: devSession.user.user_metadata?.name || devSession.user.email,
              email: devSession.user.email,
              position: "Administrador",
              department: "Desarrollo",
              access_level: "direccion",
              employee_type: "dev",
              username: devSession.user.email,
              last_login: new Date().toISOString()
            }
            setEmployee(adminEmployee)
            setUserLevel(AccessLevel.DIRECCION)
            setLoading(false)
            return
          }
        }

        // No session found
        setUserLevel(null)
        setEmployee(null)
        setLoading(false)
      } catch (error) {
        console.error("Error parsing session:", error)
        setUserLevel(null)
        setEmployee(null)
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
  }, [])

  const checkPermission = (permission: Permission): boolean => {
    if (!userLevel) return false
    return hasPermission(userLevel, permission)
  }

  const checkCanManageEmployee = (targetLevel: AccessLevel): boolean => {
    if (!userLevel) return false
    return canManageEmployee(userLevel, targetLevel)
  }

  const canViewFinancialInfo = (): boolean => {
    return checkPermission(Permission.VIEW_FINANCIAL_METRICS) || 
           checkPermission(Permission.VIEW_TOTAL_REVENUE)
  }

  const canManageInventoryCheck = (): boolean => {
    return checkPermission(Permission.MANAGE_INVENTORY)
  }

  const canEditMembersCheck = (): boolean => {
    return checkPermission(Permission.EDIT_MEMBERS)
  }

  const canApplyDiscountsCheck = (): boolean => {
    return checkPermission(Permission.APPLY_DISCOUNTS)
  }

  return {
    userLevel,
    loading,
    employee,
    hasPermission: checkPermission,
    canManageEmployee: checkCanManageEmployee,
    canViewFinancialInfo,
    canManageInventory: canManageInventoryCheck,
    canEditMembers: canEditMembersCheck,
    canApplyDiscounts: canApplyDiscountsCheck
  }
}

// Helper hook for component-level permission checks
export function useRequirePermission(permission: Permission) {
  const { hasPermission: checkPermission, loading } = usePermissions()
  
  return {
    hasAccess: checkPermission(permission),
    loading
  }
}

// Helper hook for checking multiple permissions
export function useRequirePermissions(permissions: Permission[], requireAll = true) {
  const { hasPermission: checkPermission, loading } = usePermissions()
  
  const hasAccess = requireAll 
    ? permissions.every(permission => checkPermission(permission))
    : permissions.some(permission => checkPermission(permission))
  
  return {
    hasAccess,
    loading
  }
}