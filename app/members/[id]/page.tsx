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
  User, Mail, Phone, MapPin, Calendar, CreditCard,
  Edit, Save, X, Trash2, FileText, AlertTriangle,
  Clock, Users, DollarSign, CheckCircle, XCircle
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface Contract {
  id: string
  contract_id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
}

interface Member {
  id: string
  member_id?: string
  first_name: string
  paternal_last_name: string
  maternal_last_name?: string
  name?: string
  email: string
  primary_phone: string
  secondary_phone?: string
  date_of_birth?: string
  address_1?: string
  city?: string
  state?: string
  zip_code?: string
  status: string
  selected_plan?: string
  monthly_amount?: number
  start_date?: string
  expiration_date?: string
  access_type?: string
  direct_debit?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  how_did_you_hear?: string
  notes?: string
  created_at?: string
  updated_at?: string
  contracts?: Contract[]
}

interface MemberDetailPageProps {
  params: Promise<{ id: string }>
}

export default function MemberDetailPage({ params }: MemberDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Member>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    fetchMember()
  }, [id])

  const fetchMember = async () => {
    try {
      const response = await fetch(`/api/members/${id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setMember(result.data)
          setEditForm(result.data)
        } else {
          toast.error("Miembro no encontrado")
          router.push("/members")
        }
      } else {
        toast.error("Error al cargar miembro")
        router.push("/members")
      }
    } catch (error) {
      console.error("Error fetching member:", error)
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!member) return
    setSaving(true)

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setMember(result.data)
        setEditing(false)
        toast.success("Miembro actualizado correctamente")
      } else {
        toast.error(result.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error updating member:", error)
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!member) return

    try {
      const response = await fetch(`/api/members/${member.id}`, {
        method: "DELETE"
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Miembro dado de baja")
        router.push("/members")
      } else {
        toast.error(result.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error deleting member:", error)
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
    if (!amount) return "N/A"
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN"
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "inactive": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "suspended": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Activo"
      case "inactive": return "Inactivo"
      case "pending": return "Pendiente"
      case "suspended": return "Suspendido"
      default: return status
    }
  }

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800"
      case "expired": return "bg-red-100 text-red-800"
      case "cancelled": return "bg-gray-100 text-gray-800"
      case "pending": return "bg-yellow-100 text-yellow-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout title="Cargando..." showBackButton backHref="/members">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando miembro...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!member) {
    return (
      <AuthenticatedLayout title="Error" showBackButton backHref="/members">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Miembro no encontrado</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  const displayName = member.name || `${member.first_name} ${member.paternal_last_name}`

  return (
    <AuthenticatedLayout
      title={displayName}
      showBackButton
      backHref="/members"
      headerActions={
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Dar de Baja
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                setEditing(false)
                setEditForm(member)
              }}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold">{displayName}</h2>
                  <Badge className={getStatusColor(member.status)}>
                    {getStatusLabel(member.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {member.selected_plan || "Sin plan"}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatCurrency(member.monthly_amount)}/mes
                  </span>
                  {member.member_id && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      ID: {member.member_id}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {member.direct_debit === 'Domiciliado' ? (
                      <><CheckCircle className="h-4 w-4 text-green-600" /> Domiciliado</>
                    ) : (
                      <><XCircle className="h-4 w-4 text-gray-400" /> No domiciliado</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Información de Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nombre</Label>
                      <Input
                        value={editForm.first_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Apellido Paterno</Label>
                      <Input
                        value={editForm.paternal_last_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, paternal_last_name: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono Principal</Label>
                    <Input
                      value={editForm.primary_phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, primary_phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono Secundario</Label>
                    <Input
                      value={editForm.secondary_phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, secondary_phone: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{member.primary_phone || "N/A"}</span>
                  </div>
                  {member.secondary_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{member.secondary_phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Nacimiento: {formatDate(member.date_of_birth)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Dirección</Label>
                    <Input
                      value={editForm.address_1 || ""}
                      onChange={(e) => setEditForm({ ...editForm, address_1: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Ciudad</Label>
                      <Input
                        value={editForm.city || ""}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Input
                        value={editForm.state || ""}
                        onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Código Postal</Label>
                    <Input
                      value={editForm.zip_code || ""}
                      onChange={(e) => setEditForm({ ...editForm, zip_code: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p>{member.address_1 || "Sin dirección"}</p>
                  <p>{[member.city, member.state, member.zip_code].filter(Boolean).join(", ") || "N/A"}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Membership Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Información de Membresía
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Plan</Label>
                    <Input
                      value={editForm.selected_plan || ""}
                      onChange={(e) => setEditForm({ ...editForm, selected_plan: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Monto Mensual</Label>
                    <Input
                      type="number"
                      value={editForm.monthly_amount || ""}
                      onChange={(e) => setEditForm({ ...editForm, monthly_amount: parseFloat(e.target.value) })}
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
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="suspended">Suspendido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Domiciliación</Label>
                    <Select
                      value={editForm.direct_debit || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, direct_debit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Domiciliado">Domiciliado</SelectItem>
                        <SelectItem value="No domiciliado">No domiciliado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Plan</span>
                    <span>{member.selected_plan || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monto Mensual</span>
                    <span>{formatCurrency(member.monthly_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Inicio</span>
                    <span>{formatDate(member.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Vencimiento</span>
                    <span>{formatDate(member.expiration_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tipo de Acceso</span>
                    <span>{member.access_type || "N/A"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacto de Emergencia
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={editForm.emergency_contact_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input
                      value={editForm.emergency_contact_phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nombre</span>
                    <span>{member.emergency_contact_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span>{member.emergency_contact_phone || "N/A"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Contracts */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contratos ({member.contracts?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {member.contracts && member.contracts.length > 0 ? (
                <div className="space-y-3">
                  {member.contracts.map((contract) => (
                    <Link
                      key={contract.id}
                      href={`/contracts/${contract.id}`}
                      className="block p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{contract.contract_id}</span>
                            <Badge className={getContractStatusColor(contract.status)}>
                              {contract.status === 'active' ? 'Activo' :
                               contract.status === 'expired' ? 'Vencido' :
                               contract.status === 'cancelled' ? 'Cancelado' : contract.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {contract.contract_type} - {formatCurrency(contract.monthly_fee)}/mes
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <p>{formatDate(contract.start_date)}</p>
                          <p>hasta {formatDate(contract.end_date)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No hay contratos registrados
                </p>
              )}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block">Registrado</span>
                  <span>{formatDate(member.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Actualizado</span>
                  <span>{formatDate(member.updated_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">¿Cómo nos conoció?</span>
                  <span>{member.how_did_you_hear || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <h3 className="text-lg font-semibold">Confirmar Baja</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                ¿Estás seguro de que deseas dar de baja a <strong>{displayName}</strong>?
                El miembro será marcado como inactivo pero sus datos se conservarán.
              </p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete} className="flex-1">
                  Confirmar Baja
                </Button>
                <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AuthenticatedLayout>
  )
}
