"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Cloud, Shield, Bell, ArrowLeft, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  const settingsCards = [
    {
      title: "Integraciones",
      description: "Configura sincronización con Monday.com y otros servicios",
      icon: Cloud,
      href: "/settings/integrations",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Seguridad",
      description: "Gestiona permisos y niveles de acceso",
      icon: Shield,
      href: "/settings/security",
      color: "bg-green-100 text-green-600",
      disabled: true
    },
    {
      title: "Notificaciones",
      description: "Configura alertas y notificaciones del sistema",
      icon: Bell,
      href: "/settings/notifications",
      color: "bg-yellow-100 text-yellow-600",
      disabled: true
    }
  ]

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al inicio
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-2">Administra la configuración del sistema</p>
      </div>

      <div className="grid gap-4">
        {settingsCards.map((card) => (
          <Link
            key={card.href}
            href={card.disabled ? "#" : card.href}
            className={card.disabled ? "cursor-not-allowed" : ""}
          >
            <Card className={`transition-all ${card.disabled ? 'opacity-50' : 'hover:shadow-md hover:border-primary/50'}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${card.color}`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{card.title}</CardTitle>
                      <CardDescription>{card.description}</CardDescription>
                    </div>
                  </div>
                  {!card.disabled && (
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  )}
                  {card.disabled && (
                    <span className="text-xs text-muted-foreground">Próximamente</span>
                  )}
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
