"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { RefreshCw, Check, X, Cloud, Users, Briefcase, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface SyncStatus {
  configured: boolean
  boards: Record<string, { configured: boolean; itemCount?: number }>
}

interface SyncResult {
  success: boolean
  synced: number
  created: number
  updated: number
  errors: string[]
}

export default function IntegrationsPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [selectedEntities, setSelectedEntities] = useState({
    members: true,
    employees: true,
    contracts: true
  })
  const [lastSyncResult, setLastSyncResult] = useState<{
    results: Record<string, SyncResult>
    message: string
  } | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/monday/sync-all")
      const data = await response.json()
      if (data.success !== false) {
        setStatus(data)
      }
    } catch (error) {
      console.error("Error fetching status:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setLastSyncResult(null)

    try {
      const entities = Object.entries(selectedEntities)
        .filter(([_, selected]) => selected)
        .map(([entity]) => entity)

      if (entities.length === 0) {
        toast.error("Selecciona al menos una entidad para sincronizar")
        setSyncing(false)
        return
      }

      const response = await fetch(`/api/monday/sync-all?entities=${entities.join(",")}`, {
        method: "POST"
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setLastSyncResult({
          results: data.results,
          message: data.message
        })
        fetchStatus() // Refresh status
      } else {
        toast.error(data.error || "Error durante la sincronización")
        if (data.errors?.length > 0) {
          setLastSyncResult({
            results: data.results || {},
            message: data.errors.join(", ")
          })
        }
      }
    } catch (error) {
      toast.error("Error de conexión")
    } finally {
      setSyncing(false)
    }
  }

  const toggleEntity = (entity: keyof typeof selectedEntities) => {
    setSelectedEntities(prev => ({
      ...prev,
      [entity]: !prev[entity]
    }))
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver al inicio
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <p className="text-muted-foreground mt-2">Configura y sincroniza con servicios externos</p>
      </div>

      {/* Monday.com Integration Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Cloud className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <CardTitle>Monday.com</CardTitle>
                <CardDescription>Sincronización bidireccional con Monday.com</CardDescription>
              </div>
            </div>
            {loading ? (
              <Badge variant="outline">Cargando...</Badge>
            ) : status?.configured ? (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Configurado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <X className="h-3 w-3 mr-1" />
                No configurado
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {!status?.configured ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Para habilitar la sincronización con Monday.com, configura las siguientes variables de entorno:
              </p>
              <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                <li>MONDAY_API_TOKEN</li>
                <li>MONDAY_MEMBERS_BOARD_ID</li>
                <li>MONDAY_EMPLOYEES_BOARD_ID</li>
                <li>MONDAY_CONTRACTS_BOARD_ID</li>
              </ul>
            </div>
          ) : (
            <>
              {/* Board Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <BoardStatusCard
                  title="Miembros"
                  icon={<Users className="h-4 w-4" />}
                  configured={status.boards.members?.configured}
                  itemCount={status.boards.members?.itemCount}
                />
                <BoardStatusCard
                  title="Empleados"
                  icon={<Briefcase className="h-4 w-4" />}
                  configured={status.boards.employees?.configured}
                  itemCount={status.boards.employees?.itemCount}
                />
                <BoardStatusCard
                  title="Contratos"
                  icon={<FileText className="h-4 w-4" />}
                  configured={status.boards.contracts?.configured}
                  itemCount={status.boards.contracts?.itemCount}
                />
                <BoardStatusCard
                  title="Productos"
                  icon={<Cloud className="h-4 w-4" />}
                  configured={status.boards.products?.configured}
                  itemCount={status.boards.products?.itemCount}
                />
              </div>

              {/* Sync Options */}
              <div className="border rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-3">Seleccionar entidades a sincronizar</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedEntities.members}
                      onCheckedChange={() => toggleEntity("members")}
                    />
                    <span>Miembros</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedEntities.employees}
                      onCheckedChange={() => toggleEntity("employees")}
                    />
                    <span>Empleados</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={selectedEntities.contracts}
                      onCheckedChange={() => toggleEntity("contracts")}
                    />
                    <span>Contratos</span>
                  </label>
                </div>
              </div>

              {/* Sync Button */}
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sincronizar con Monday.com
                  </>
                )}
              </Button>

              {/* Last Sync Result */}
              {lastSyncResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Resultado de la sincronización</h4>
                  <p className="text-sm text-muted-foreground mb-2">{lastSyncResult.message}</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {Object.entries(lastSyncResult.results).map(([entity, result]) => (
                      <div key={entity} className="p-2 bg-background rounded border">
                        <div className="font-medium capitalize">{entity}</div>
                        <div className="text-xs text-muted-foreground">
                          {result.created} creados, {result.updated} actualizados
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instrucciones de configuración</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Obtén tu API Token de Monday.com en Admin {'>'} API</li>
            <li>Crea tableros en Monday.com para Miembros, Empleados y Contratos</li>
            <li>Copia los IDs de cada tablero (se encuentran en la URL)</li>
            <li>Configura las variables de entorno en tu archivo .env</li>
            <li>Reinicia el servidor para aplicar los cambios</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}

function BoardStatusCard({
  title,
  icon,
  configured,
  itemCount
}: {
  title: string
  icon: React.ReactNode
  configured?: boolean
  itemCount?: number
}) {
  return (
    <div className={`p-3 rounded-lg border ${configured ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        {configured ? (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            {itemCount !== undefined ? `${itemCount} items` : 'Listo'}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-gray-100 text-gray-600">
            No configurado
          </Badge>
        )}
      </div>
    </div>
  )
}
