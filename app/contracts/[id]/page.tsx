"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import {
  FileText, User, Calendar, DollarSign, Edit, Save, X,
  AlertTriangle, Clock, CreditCard, Ban, CheckCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Member {
  id: string
  name: string
  email: string
  primary_phone: string
  status: string
}

interface Contract {
  id: string
  contract_id: string
  member_id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  total_amount?: number
  payment_day?: number
  status: string
  cancellation_reason?: string
  cancelled_at?: string
  created_at?: string
  updated_at?: string
  member?: Member
}

interface ContractDetailPageProps {
  params: Promise<{ id: string }>
}

export default function ContractDetailPage({ params }: ContractDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Contract>>({})
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  useEffect(() => {
    fetchContract()
  }, [id])

  const fetchContract = async () => {
    try {
      const response = await fetch(`/api/contracts/${id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setContract(result.data)
          setEditForm(result.data)
        } else {
          toast.error("Contrato no encontrado")
          router.push("/contracts")
        }
      } else {
        toast.error("Error al cargar contrato")
        router.push("/contracts")
      }
    } catch (error) {
      console.error("Error fetching contract:", error)
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!contract) return
    setSaving(true)

    try {
      const response = await fetch(`/api/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setContract({ ...contract, ...result.data })
        setEditing(false)
        toast.success("Contrato actualizado correctamente")
      } else {
        toast.error(result.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error updating contract:", error)
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!contract) return

    try {
      const url = cancelReason
        ? `/api/contracts/${contract.id}?reason=${encodeURIComponent(cancelReason)}`
        : `/api/contracts/${contract.id}`

      const response = await fetch(url, {
        method: "DELETE"
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Contrato cancelado")
        fetchContract()
        setShowCancelConfirm(false)
        setCancelReason("")
      } else {
        toast.error(result.error || "Error al cancelar")
      }
    } catch (error) {
      console.error("Error cancelling contract:", error)
      toast.error("Error de conexión")
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount: number | undefined) => {
    if (!amount && amount !== 0) return "N/A"
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN"
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "expired": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "cancelled": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "suspended": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Activo"
      case "expired": return "Vencido"
      case "cancelled": return "Cancelado"
      case "pending": return "Pendiente"
      case "suspended": return "Suspendido"
      default: return status
    }
  }

  const getContractTypeLabel = (type: string) => {
    switch (type) {
      case "monthly": return "Mensual"
      case "quarterly": return "Trimestral"
      case "biannual": return "Semestral"
      case "annual": return "Anual"
      case "day_pass": return "Pase de día"
      default: return type
    }
  }

  const getDaysRemaining = () => {
    if (!contract?.end_date) return null
    const end = new Date(contract.end_date)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <AuthenticatedLayout title="Cargando..." showBackButton backHref="/contracts">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando contrato...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!contract) {
    return (
      <AuthenticatedLayout title="Error" showBackButton backHref="/contracts">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Contrato no encontrado</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  const daysRemaining = getDaysRemaining()

  return (
    <AuthenticatedLayout
      title={`Contrato ${contract.contract_id}`}
      showBackButton
      backHref="/contracts"
      headerActions={
        <div className="flex gap-2">
          {!editing && contract.status !== 'cancelled' ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowCancelConfirm(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Cancelar Contrato
              </Button>
            </>
          ) : editing ? (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setEditing(false)
                setEditForm(contract)
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{contract.contract_id}</h2>
                  <Badge className={getStatusColor(contract.status)}>
                    {getStatusLabel(contract.status)}
                  </Badge>
                  <Badge variant="outline">
                    {getContractTypeLabel(contract.contract_type)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(contract.monthly_fee)}/mes
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                  </span>
                  {daysRemaining !== null && contract.status === 'active' && (
                    <span className={`flex items-center gap-1 ${daysRemaining < 30 ? 'text-orange-600' : ''}`}>
                      <Clock className="h-4 w-4" />
                      {daysRemaining > 0 ? `${daysRemaining} días restantes` : 'Vence hoy'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Member Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Miembro
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contract.member ? (
                <div className="space-y-4">
                  <Link
                    href={`/members/${contract.member.id}`}
                    className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{contract.member.name}</p>
                        <p className="text-sm text-muted-foreground">{contract.member.email}</p>
                        <p className="text-sm text-muted-foreground">{contract.member.primary_phone}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ) : (
                <p className="text-muted-foreground">Sin información del miembro</p>
              )}
            </CardContent>
          </Card>

          {/* Contract Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Detalles del Contrato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Tipo de Contrato</Label>
                    <Select
                      value={editForm.contract_type || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, contract_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mensual</SelectItem>
                        <SelectItem value="quarterly">Trimestral</SelectItem>
                        <SelectItem value="biannual">Semestral</SelectItem>
                        <SelectItem value="annual">Anual</SelectItem>
                        <SelectItem value="day_pass">Pase de día</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cuota Mensual</Label>
                    <Input
                      type="number"
                      value={editForm.monthly_fee || ""}
                      onChange={(e) => setEditForm({ ...editForm, monthly_fee: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Día de Pago</Label>
                    <Input
                      type="number"
                      min="1"
                      max="28"
                      value={editForm.payment_day || ""}
                      onChange={(e) => setEditForm({ ...editForm, payment_day: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={editForm.status || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="suspended">Suspendido</SelectItem>
                        <SelectItem value="expired">Vencido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo</span>
                    <span>{getContractTypeLabel(contract.contract_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cuota Mensual</span>
                    <span className="font-medium">{formatCurrency(contract.monthly_fee)}</span>
                  </div>
                  {contract.total_amount && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto Total</span>
                      <span>{formatCurrency(contract.total_amount)}</span>
                    </div>
                  )}
                  {contract.payment_day && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Día de Pago</span>
                      <span>Día {contract.payment_day} del mes</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de Inicio</span>
                <span>{formatDate(contract.start_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de Vencimiento</span>
                <span>{formatDate(contract.end_date)}</span>
              </div>
              {daysRemaining !== null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Días Restantes</span>
                  <span className={daysRemaining < 30 ? 'text-orange-600 font-medium' : ''}>
                    {daysRemaining > 0 ? daysRemaining : 'Vencido'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cancellation Info (if cancelled) */}
          {contract.status === 'cancelled' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Ban className="h-5 w-5" />
                  Información de Cancelación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fecha de Cancelación</span>
                  <span>{formatDate(contract.cancelled_at)}</span>
                </div>
                {contract.cancellation_reason && (
                  <div>
                    <span className="text-muted-foreground block mb-2">Motivo</span>
                    <p className="bg-muted p-3 rounded">{contract.cancellation_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* System Info */}
          <Card className={contract.status === 'cancelled' ? '' : 'md:col-span-2'}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Creado</span>
                  <span>{formatDate(contract.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Actualizado</span>
                  <span>{formatDate(contract.updated_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ID del Miembro</span>
                  <span className="font-mono text-xs">{contract.member_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">ID del Contrato</span>
                  <span className="font-mono text-xs">{contract.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <h3 className="text-lg font-semibold">Cancelar Contrato</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                ¿Estás seguro de que deseas cancelar el contrato <strong>{contract.contract_id}</strong>?
                Esta acción no se puede deshacer.
              </p>
              <div className="mb-6">
                <Label>Motivo de cancelación (opcional)</Label>
                <Textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ingresa el motivo de la cancelación..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleCancel} className="flex-1">
                  Confirmar Cancelación
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowCancelConfirm(false)
                  setCancelReason("")
                }}>
                  Volver
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AuthenticatedLayout>
  )
}
