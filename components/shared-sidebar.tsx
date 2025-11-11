"use client"

import { Activity, TrendingUp, Users, FileText, DollarSign, Calendar, Package, Briefcase, LogOut, TestTube, ShoppingBag, Warehouse } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

export function SharedSidebar() {
  const pathname = usePathname()
  const [employeeSession, setEmployeeSession] = useState<{
    id: string
    name: string
    email: string
    position: string
    department: string
    access_level: string
    employee_type: string
    username: string
    last_login: string | null
  } | null>(null)

  useEffect(() => {
    // Check for sessions in localStorage (only on client side)
    if (typeof window !== 'undefined') {
      // First check for employee session
      const employeeSessionStr = localStorage.getItem("employeeSession")
      if (employeeSessionStr) {
        try {
          setEmployeeSession(JSON.parse(employeeSessionStr))
          return
        } catch (error) {
          console.error("Error parsing employee session:", error)
        }
      }

      // Then check for dev session and convert to employee format
      const devSessionStr = localStorage.getItem("devSession")
      if (devSessionStr) {
        try {
          const devSession = JSON.parse(devSessionStr)
          if (devSession && devSession.user) {
            // Convert dev session to employee format for sidebar display
            setEmployeeSession({
              id: devSession.user.id,
              name: devSession.user.name || devSession.user.email,
              email: devSession.user.email,
              position: devSession.user.role || 'Admin',
              department: 'Development',
              access_level: 'full',
              employee_type: 'A',
              username: devSession.user.email,
              last_login: new Date().toISOString()
            })
          }
        } catch (error) {
          console.error("Error parsing dev session:", error)
        }
      }
    }
  }, [])

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("employeeSession")
      localStorage.removeItem("devSession")
    }
    setEmployeeSession(null)
    window.location.href = "/auth/login"
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">AI Gym 24/7</span>
            <span className="text-xs text-muted-foreground">Gestión Inteligente de Gimnasio</span>
          </div>
        </div>
        {employeeSession && (
          <div className="px-2 py-2 border-t border-sidebar-border">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-medium">{employeeSession.name}</span>
                <span className="text-xs text-muted-foreground">
                  {employeeSession.position} - Tipo {employeeSession.employee_type}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 hover:bg-muted rounded"
                title="Cerrar Sesión"
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/")}>
              <Link href="/">
                <TrendingUp className="h-4 w-4" />
                <span>Panel de Control</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/inventory")}>
              <Link href="/inventory">
                <Warehouse className="h-4 w-4" />
                <span>Inventario</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/pos")}>
              <Link href="/pos">
                <ShoppingBag className="h-4 w-4" />
                <span>Punto de Venta</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/products")}>
              <Link href="/products">
                <Package className="h-4 w-4" />
                <span>Productos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/members")}>
              <Link href="/members">
                <Users className="h-4 w-4" />
                <span>Socios</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/employees")}>
              <Link href="/employees">
                <Briefcase className="h-4 w-4" />
                <span>Empleados</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/contracts")}>
              <Link href="/contracts">
                <FileText className="h-4 w-4" />
                <span>Contratos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Ocultar sección de pagos para empleados Tipo B */}
          {(!employeeSession || employeeSession.employee_type !== "B") && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/payments")}>
                <Link href="/payments">
                  <DollarSign className="h-4 w-4" />
                  <span>Pagos</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/schedule")}>
              <Link href="/schedule">
                <Calendar className="h-4 w-4" />
                <span>Horarios</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive("/payments/test")}>
              <Link href="/payments/test">
                <TestTube className="h-4 w-4" />
                <span>Pruebas de Pago</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  )
}
