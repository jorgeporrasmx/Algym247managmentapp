// Employee access levels enum
export enum AccessLevel {
  DIRECCION = 'direccion',
  GERENTE = 'gerente', 
  VENTAS = 'ventas',
  RECEPCIONISTA = 'recepcionista',
  ENTRENADOR = 'entrenador'
}

// Hierarchy levels (lower number = higher access)
export const ACCESS_HIERARCHY = {
  [AccessLevel.DIRECCION]: 1,
  [AccessLevel.GERENTE]: 2,
  [AccessLevel.VENTAS]: 3,
  [AccessLevel.RECEPCIONISTA]: 4,
  [AccessLevel.ENTRENADOR]: 5
}

// Permission categories
export enum Permission {
  // Financial information (sensitive)
  VIEW_FINANCIAL_METRICS = 'view_financial_metrics',
  VIEW_TOTAL_REVENUE = 'view_total_revenue', 
  VIEW_EMPLOYEE_SALARIES = 'view_employee_salaries',
  VIEW_PROFIT_REPORTS = 'view_profit_reports',
  
  // Employee management
  MANAGE_ALL_EMPLOYEES = 'manage_all_employees',
  MANAGE_LOWER_EMPLOYEES = 'manage_lower_employees',
  VIEW_EMPLOYEE_DETAILS = 'view_employee_details',
  
  // Members/Socios management
  CREATE_MEMBERS = 'create_members',
  EDIT_MEMBERS = 'edit_members', 
  DELETE_MEMBERS = 'delete_members',
  VIEW_MEMBERS = 'view_members',
  
  // Sales and inventory
  REGISTER_PRODUCT_SALES = 'register_product_sales',
  REGISTER_SERVICE_SALES = 'register_service_sales',
  VIEW_INVENTORY = 'view_inventory',
  MANAGE_INVENTORY = 'manage_inventory',
  APPLY_DISCOUNTS = 'apply_discounts',
  
  // Reports and analytics
  VIEW_BASIC_METRICS = 'view_basic_metrics',
  VIEW_DETAILED_REPORTS = 'view_detailed_reports',
  
  // System administration
  SYSTEM_SETTINGS = 'system_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs'
}

// Permissions matrix - defines what each access level can do
export const PERMISSIONS_MATRIX: Record<AccessLevel, Permission[]> = {
  [AccessLevel.DIRECCION]: [
    // Full access to everything
    Permission.VIEW_FINANCIAL_METRICS,
    Permission.VIEW_TOTAL_REVENUE,
    Permission.VIEW_EMPLOYEE_SALARIES,
    Permission.VIEW_PROFIT_REPORTS,
    Permission.MANAGE_ALL_EMPLOYEES,
    Permission.VIEW_EMPLOYEE_DETAILS,
    Permission.CREATE_MEMBERS,
    Permission.EDIT_MEMBERS,
    Permission.DELETE_MEMBERS,
    Permission.VIEW_MEMBERS,
    Permission.REGISTER_PRODUCT_SALES,
    Permission.REGISTER_SERVICE_SALES,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.APPLY_DISCOUNTS,
    Permission.VIEW_BASIC_METRICS,
    Permission.VIEW_DETAILED_REPORTS,
    Permission.SYSTEM_SETTINGS,
    Permission.VIEW_AUDIT_LOGS
  ],
  
  [AccessLevel.GERENTE]: [
    // Financial access + management (no employee salaries access to other direccion)
    Permission.VIEW_FINANCIAL_METRICS,
    Permission.VIEW_TOTAL_REVENUE,
    Permission.VIEW_PROFIT_REPORTS,
    Permission.MANAGE_LOWER_EMPLOYEES, // Can't manage direccion level
    Permission.VIEW_EMPLOYEE_DETAILS,
    Permission.CREATE_MEMBERS,
    Permission.EDIT_MEMBERS,
    Permission.DELETE_MEMBERS,
    Permission.VIEW_MEMBERS,
    Permission.REGISTER_PRODUCT_SALES,
    Permission.REGISTER_SERVICE_SALES,
    Permission.VIEW_INVENTORY,
    Permission.MANAGE_INVENTORY,
    Permission.APPLY_DISCOUNTS,
    Permission.VIEW_BASIC_METRICS,
    Permission.VIEW_DETAILED_REPORTS,
    Permission.VIEW_AUDIT_LOGS
  ],
  
  [AccessLevel.VENTAS]: [
    // Focus on sales and member management, no financial data
    Permission.CREATE_MEMBERS,
    Permission.EDIT_MEMBERS,
    Permission.VIEW_MEMBERS,
    Permission.REGISTER_PRODUCT_SALES,
    Permission.REGISTER_SERVICE_SALES,
    Permission.VIEW_INVENTORY, // Can see products but not financial metrics
    Permission.VIEW_BASIC_METRICS // Basic sales metrics, no revenue
  ],
  
  [AccessLevel.RECEPCIONISTA]: [
    // Customer service focus, basic sales
    Permission.CREATE_MEMBERS,
    Permission.VIEW_MEMBERS,
    Permission.REGISTER_PRODUCT_SALES,
    Permission.REGISTER_SERVICE_SALES,
    Permission.VIEW_BASIC_METRICS
  ],
  
  [AccessLevel.ENTRENADOR]: [
    // Training focus, limited sales (mainly services)
    Permission.CREATE_MEMBERS, // For new training clients
    Permission.VIEW_MEMBERS, // To see training schedules
    Permission.REGISTER_SERVICE_SALES, // Personal training sessions
    Permission.VIEW_BASIC_METRICS // Basic performance metrics
  ]
}

// Helper functions
export function hasPermission(userLevel: AccessLevel, permission: Permission): boolean {
  return PERMISSIONS_MATRIX[userLevel].includes(permission)
}

export function canManageEmployee(managerLevel: AccessLevel, targetLevel: AccessLevel): boolean {
  const managerHierarchy = ACCESS_HIERARCHY[managerLevel]
  const targetHierarchy = ACCESS_HIERARCHY[targetLevel]
  
  // Can manage if manager has higher or equal hierarchy level
  // But gerente cannot manage direccion
  if (managerLevel === AccessLevel.GERENTE && targetLevel === AccessLevel.DIRECCION) {
    return false
  }
  
  return managerHierarchy <= targetHierarchy
}

export function getAccessLevelFromString(level: string): AccessLevel {
  const normalizedLevel = level.toLowerCase()
  switch (normalizedLevel) {
    case 'direccion':
    case 'director':
    case 'admin':
      return AccessLevel.DIRECCION
    case 'gerente':
    case 'manager':
      return AccessLevel.GERENTE
    case 'ventas':
    case 'sales':
      return AccessLevel.VENTAS
    case 'recepcionista':
    case 'reception':
    case 'staff':
      return AccessLevel.RECEPCIONISTA
    case 'entrenador':
    case 'trainer':
      return AccessLevel.ENTRENADOR
    default:
      return AccessLevel.ENTRENADOR // Default to lowest level
  }
}

export function getAccessLevelDisplayName(level: AccessLevel): string {
  switch (level) {
    case AccessLevel.DIRECCION:
      return 'Dirección'
    case AccessLevel.GERENTE:
      return 'Gerente'
    case AccessLevel.VENTAS:
      return 'Ventas'
    case AccessLevel.RECEPCIONISTA:
      return 'Recepcionista'
    case AccessLevel.ENTRENADOR:
      return 'Entrenador'
    default:
      return level
  }
}