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
  User, Mail, Phone, MapPin, Calendar, Briefcase,
  CreditCard, Shield, Edit, Save, X, Trash2, Key,
  Building, Clock, Users, FileText, AlertTriangle
} from "lucide-react"
import { toast } from "sonner"
import type { Employee } from "@/lib/types/employees"

interface EmployeeDetailPageProps {
  params: Promise<{ id: string }>
}

export default function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Employee>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginPassword, setLoginPassword] = useState("")
  const [generatingLogin, setGeneratingLogin] = useState(false)

  useEffect(() => {
    fetchEmployee()
  }, [id])

  const fetchEmployee = async () => {
    try {
      const response = await fetch(`/api/employees/${id}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setEmployee(result.data)
          setEditForm(result.data)
        } else {
          toast.error("Empleado no encontrado")
          router.push("/employees")
        }
      } else {
        toast.error("Error al cargar empleado")
        router.push("/employees")
      }
    } catch (error) {
      console.error("Error fetching employee:", error)
      toast.error("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!employee) return
    setSaving(true)

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setEmployee(result.data)
        setEditing(false)
        toast.success("Empleado actualizado correctamente")
      } else {
        toast.error(result.error || "Error al actualizar")
      }
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Error de conexión")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!employee) return

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "DELETE"
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Empleado dado de baja")
        router.push("/employees")
      } else {
        toast.error(result.error || "Error al eliminar")
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Error de conexión")
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleCreateLogin = async () => {
    if (!employee || !loginPassword) return

    if (loginPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setGeneratingLogin(true)
    try {
      const response = await fetch("/api/auth/employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-credentials",
          employee_id: employee.id,
          password: loginPassword
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("Credenciales creadas exitosamente")
        setShowLoginModal(false)
        setLoginPassword("")
        fetchEmployee()
      } else {
        toast.error(result.error || "Error creando credenciales")
      }
    } catch (error) {
      console.error("Error creating login:", error)
      toast.error("Error de conexión")
    } finally {
      setGeneratingLogin(false)
    }
  }

  const formatDate = (dateString: string | Date | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString as string).toLocaleDateString('es-MX', {
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
      case "terminated": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "Activo"
      case "inactive": return "Inactivo"
      case "pending": return "Pendiente"
      case "terminated": return "Terminado"
      default: return status
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout title="Cargando..." showBackButton backHref="/employees">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando empleado...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!employee) {
    return (
      <AuthenticatedLayout title="Error" showBackButton backHref="/employees">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Empleado no encontrado</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout
      title={employee.name}
      showBackButton
      backHref="/employees"
      headerActions={
        <div className="flex gap-2">
          {!editing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => {
                setLoginPassword(generateRandomPassword())
                setShowLoginModal(true)
              }}>
                <Key className="h-4 w-4 mr-2" />
                Generar Acceso
              </Button>
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
                setEditForm(employee)
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
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <Badge className={getStatusColor(employee.status)}>
                    {getStatusLabel(employee.status)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-4 w-4" />
                    {employee.position || "Sin puesto"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="h-4 w-4" />
                    {employee.department || "Sin departamento"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    {employee.access_level || "Sin nivel de acceso"}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    ID: {employee.employee_id}
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
                    <span>{employee.email}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{employee.primary_phone || "N/A"}</span>
                  </div>
                  {employee.secondary_phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{employee.secondary_phone}</span>
                    </div>
                  )}
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
                  <p>{employee.address_1 || "Sin dirección"}</p>
                  <p>{[employee.city, employee.state, employee.zip_code].filter(Boolean).join(", ") || "N/A"}</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Información Laboral
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div>
                    <Label>Puesto</Label>
                    <Input
                      value={editForm.position || ""}
                      onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    <Input
                      value={editForm.department || ""}
                      onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Nivel de Acceso</Label>
                    <Select
                      value={editForm.access_level as string || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, access_level: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direccion">Dirección</SelectItem>
                        <SelectItem value="gerente">Gerente</SelectItem>
                        <SelectItem value="ventas">Ventas</SelectItem>
                        <SelectItem value="recepcionista">Recepcionista</SelectItem>
                        <SelectItem value="entrenador">Entrenador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Salario Mensual</Label>
                    <Input
                      type="number"
                      value={editForm.salary || ""}
                      onChange={(e) => setEditForm({ ...editForm, salary: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select
                      value={editForm.status || ""}
                      onValueChange={(value) => setEditForm({ ...editForm, status: value as Employee['status'] })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="terminated">Terminado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Puesto</span>
                    <span>{employee.position || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Departamento</span>
                    <span>{employee.department || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha Contratación</span>
                    <span>{formatDate(employee.hire_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Salario</span>
                    <span>{formatCurrency(employee.salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Horario</span>
                    <span>{employee.work_schedule || "N/A"}</span>
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
                    <span>{employee.emergency_contact_name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Teléfono</span>
                    <span>{employee.emergency_contact_phone || "N/A"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <Textarea
                  value={editForm.notes || ""}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  placeholder="Notas adicionales sobre el empleado..."
                />
              ) : (
                <p className="text-muted-foreground">
                  {employee.notes || "Sin notas"}
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
                  <span className="text-muted-foreground block">Creado</span>
                  <span>{formatDate(employee.created_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Actualizado</span>
                  <span>{formatDate(employee.updated_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Último Login</span>
                  <span>{formatDate(employee.last_login) || "Nunca"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tiene Acceso</span>
                  <Badge variant={employee.has_login ? "default" : "secondary"}>
                    {employee.has_login ? "Sí" : "No"}
                  </Badge>
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
                ¿Estás seguro de que deseas dar de baja a <strong>{employee.name}</strong>?
                El empleado será marcado como terminado pero sus datos se conservarán.
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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Generar Acceso para {employee.name}
              </h3>

              <div className="space-y-4">
                <div className="text-sm bg-muted p-3 rounded">
                  <strong>Email:</strong> {employee.email}
                </div>

                <div>
                  <Label>Contraseña</Label>
                  <Input
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>

                <div className="text-sm bg-blue-50 dark:bg-blue-950 p-3 rounded">
                  <strong>Nivel de Acceso:</strong> {employee.access_level || 'No definido'}
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button
                  onClick={handleCreateLogin}
                  disabled={generatingLogin || loginPassword.length < 8}
                  className="flex-1"
                >
                  {generatingLogin ? "Creando..." : "Crear Acceso"}
                </Button>
                <Button variant="outline" onClick={() => setShowLoginModal(false)}>
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
