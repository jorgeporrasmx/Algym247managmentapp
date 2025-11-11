"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { useAuth } from "@/components/authenticated-layout"
import { FinancialProtectedSection } from "@/components/ui/protected-section"
import { TrendingUp, Users, FileText, DollarSign, Calendar, Plus, Warehouse } from "lucide-react"
import Link from "next/link"

interface Stats {
  members: number
  contracts: number
  payments: number
  schedule: number
  total: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState<Stats>({
    members: 0,
    contracts: 0,
    payments: 0,
    schedule: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error("Error fetching stats:", response.status)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const publicStatCards = useMemo(() => [
    {
      title: "Socios Totales",
      value: stats.members,
      description: "Socios activos del gimnasio",
      icon: Users,
      href: "/members",
      color: "text-blue-600"
    },
    {
      title: "Contratos Activos",
      value: stats.contracts,
      description: "Contratos vigentes",
      icon: FileText,
      href: "/contracts",
      color: "text-green-600"
    },
    {
      title: "Clases Programadas",
      value: stats.schedule,
      description: "Próximas clases",
      icon: Calendar,
      href: "/schedule",
      color: "text-purple-600"
    }
  ], [stats])

  const financialStatCards = useMemo(() => [
    {
      title: "Pagos Totales",
      value: stats.payments,
      description: "Transacciones de pago",
      icon: DollarSign,
      href: "/payments",
      color: "text-yellow-600"
    }
  ], [stats])

  return (
    <AuthenticatedLayout 
      title="Panel de Control"
      showBackButton
      backHref="/"
      headerActions={
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/members/add">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Socio
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/contracts/add">
              <FileText className="mr-2 h-4 w-4" />
              Nuevo Contrato
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Welcome Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6" />
              Bienvenido a AI Gym 24/7
            </CardTitle>
            <CardDescription>
              Panel de gestión inteligente de gimnasio. Monitorea el rendimiento de tu gimnasio y administra las operaciones eficientemente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Sesión iniciada como: <span className="font-medium">{user?.email}</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1" suppressHydrationWarning>
                  Última actualización: {new Date().toLocaleDateString('es-MX')}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs" suppressHydrationWarning>
                {new Date().toLocaleTimeString()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {publicStatCards.map((stat, index) => {
            const IconComponent = stat.icon
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <IconComponent className={`h-4 w-4 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                  ) : (
                    <div className="text-2xl font-bold" suppressHydrationWarning>
                      {stat.value.toLocaleString()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
                    <Link href={stat.href}>
                      Ver detalles →
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
          
          {/* Financial Stats - Protected */}
          <FinancialProtectedSection>
            {financialStatCards.map((stat, index) => {
              const IconComponent = stat.icon
              return (
                <Card key={`financial-${index}`} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <IconComponent className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      <div className="text-2xl font-bold" suppressHydrationWarning>
                        {stat.value.toLocaleString()}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto" asChild>
                      <Link href={stat.href}>
                        Ver detalles →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </FinancialProtectedSection>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>
              Tareas comunes y accesos directos para operaciones diarias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button asChild className="h-auto p-4 flex-col gap-2">
                <Link href="/inventory">
                  <Warehouse className="h-6 w-6" />
                  <span>Inventario y Ventas</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
                <Link href="/members/add">
                  <Users className="h-6 w-6" />
                  <span>Agregar Nuevo Socio</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
                <Link href="/contracts/add">
                  <FileText className="h-6 w-6" />
                  <span>Crear Contrato</span>
                </Link>
              </Button>
              <FinancialProtectedSection showFallback={false}>
                <Button asChild variant="outline" className="h-auto p-4 flex-col gap-2">
                  <Link href="/payments">
                    <DollarSign className="h-6 w-6" />
                    <span>Ver Pagos</span>
                  </Link>
                </Button>
              </FinancialProtectedSection>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>
              Últimas actualizaciones y actividades en tu gimnasio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Nuevo registro de socio</p>
                  <p className="text-xs text-muted-foreground">Socio agregado al sistema</p>
                </div>
                <span className="text-xs text-muted-foreground">Hace 2 horas</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Contrato renovado</p>
                  <p className="text-xs text-muted-foreground">Membresía mensual extendida</p>
                </div>
                <span className="text-xs text-muted-foreground">Hace 1 día</span>
              </div>
              <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Pago recibido</p>
                  <p className="text-xs text-muted-foreground">Pago de cuota mensual procesado</p>
                </div>
                <span className="text-xs text-muted-foreground">Hace 3 días</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
