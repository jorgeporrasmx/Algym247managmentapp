import React from 'react'
import { Permission } from '@/lib/permissions'
import { useRequirePermission, useRequirePermissions } from '@/lib/hooks/usePermissions'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Lock } from 'lucide-react'

interface ProtectedSectionProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: React.ReactNode
  showFallback?: boolean
  children: React.ReactNode
  className?: string
}

export function ProtectedSection({
  permission,
  permissions,
  requireAll = true,
  fallback,
  showFallback = true,
  children,
  className
}: ProtectedSectionProps) {
  // Handle single permission
  const singlePermissionResult = useRequirePermission(permission || Permission.VIEW_BASIC_METRICS)
  
  // Handle multiple permissions
  const multiplePermissionsResult = useRequirePermissions(
    permissions || [], 
    requireAll
  )

  // Determine which result to use
  const { hasAccess, loading } = permission 
    ? singlePermissionResult 
    : multiplePermissionsResult

  // Show loading state
  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-20 bg-muted rounded"></div>
      </div>
    )
  }

  // Show content if user has access
  if (hasAccess) {
    return <>{children}</>
  }

  // Show custom fallback if provided
  if (fallback) {
    return <>{fallback}</>
  }

  // Show default "no access" message if showFallback is true
  if (showFallback) {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardContent className="flex items-center gap-3 p-4">
          <Shield className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Acceso Restringido
            </p>
            <p className="text-xs text-amber-600">
              No tienes permisos para ver esta información
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Don't render anything
  return null
}

// Specialized component for financial information
export function FinancialProtectedSection({ 
  children, 
  className,
  showFallback = true 
}: { 
  children: React.ReactNode
  className?: string
  showFallback?: boolean
}) {
  return (
    <ProtectedSection
      permissions={[Permission.VIEW_FINANCIAL_METRICS, Permission.VIEW_TOTAL_REVENUE]}
      requireAll={false}
      className={className}
      showFallback={showFallback}
      fallback={showFallback ? (
        <Card className={`border-red-200 bg-red-50 ${className}`}>
          <CardContent className="flex items-center gap-3 p-4">
            <Lock className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Información Financiera Protegida
              </p>
              <p className="text-xs text-red-600">
                Solo Dirección y Gerencia pueden ver esta información
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    >
      {children}
    </ProtectedSection>
  )
}

// Component to hide/show UI elements based on permissions
interface PermissionGateProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

export function PermissionGate({
  permission,
  permissions,
  requireAll = true,
  fallback = null,
  children
}: PermissionGateProps) {
  return (
    <ProtectedSection
      permission={permission}
      permissions={permissions}
      requireAll={requireAll}
      fallback={fallback}
      showFallback={false}
    >
      {children}
    </ProtectedSection>
  )
}