"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, Calendar, Clock, Users, MapPin } from "lucide-react"
import Link from "next/link"

interface Schedule {
  id: string
  class_name: string
  instructor: string
  class_type: string
  start_time: string
  end_time: string
  max_capacity: number
  current_bookings: number
  location: string
  status: string
  created_at: string
}

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const response = await fetch("/api/schedule")
      if (response.ok) {
        const result = await response.json()
        // Handle the nested data structure from the API
        const schedule = result.success ? result.data : []
        setSchedule(schedule)
      }
    } catch (error) {
      console.error("Error fetching schedule:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "activo":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "cancelled":
      case "cancelado":
        return "bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-300"
      case "full":
      case "lleno":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getAvailabilityStatus = (current: number, max: number) => {
    if (current >= max) return "Lleno"
    if (current >= max * 0.8) return "Casi Lleno"
    return "Disponible"
  }

  const getAvailabilityColor = (current: number, max: number) => {
    if (current >= max) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    if (current >= max * 0.8) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
  }

  return (
    <AuthenticatedLayout 
      title="Horario de Clases"
      showBackButton
      backHref="/"
      headerActions={
        <Button asChild>
          <Link href="/schedule/add">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Clase
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando horario...</p>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay clases programadas</h3>
              <p className="text-muted-foreground mb-4">Comienza agregando tu primera clase.</p>
              <Button asChild>
                <Link href="/schedule/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Clase
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {schedule.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{classItem.class_name}</h3>
                        <Badge className={getStatusColor(classItem.status)} variant="secondary">
                          {classItem.status === 'active' ? 'activo' : classItem.status === 'cancelled' ? 'cancelado' : classItem.status === 'full' ? 'lleno' : classItem.status}
                        </Badge>
                        <Badge className={getAvailabilityColor(classItem.current_bookings || 0, classItem.max_capacity)} variant="secondary">
                          {getAvailabilityStatus(classItem.current_bookings || 0, classItem.max_capacity)}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <span className="font-medium">{classItem.instructor}</span>
                        <span>•</span>
                        <span className="capitalize">{classItem.class_type}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{classItem.current_bookings || 0}/{classItem.max_capacity}</span>
                        </div>
                        {classItem.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{classItem.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
