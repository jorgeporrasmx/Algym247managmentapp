"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, Users, Mail, Phone, Calendar, Search, MapPin, CreditCard, Briefcase, Key } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import type { Employee } from "@/lib/types/employees"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [loginForm, setLoginForm] = useState({
    password: ""
  })
  const [generatingLogin, setGeneratingLogin] = useState(false)

  useEffect(() => {
    fetchEmployees()
  }, [])

  useEffect(() => {
    // Filter employees based on search term
    const filtered = employees.filter(employee =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (employee.primary_phone && employee.primary_phone.includes(searchTerm)) ||
      (employee.first_name && employee.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.paternal_last_name && employee.paternal_last_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.position && employee.position.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (employee.department && employee.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredEmployees(filtered)
  }, [searchTerm, employees])

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees")
      if (response.ok) {
        const result = await response.json()
        // Handle the nested data structure from the API
        const employees = result.success ? result.data : []
        setEmployees(employees)
        setFilteredEmployees(employees)
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "activo":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "inactive":
      case "inactivo":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "pending":
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "terminated":
      case "terminado":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getPositionColor = (position: string) => {
    switch (position?.toLowerCase()) {
      case "manager":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "trainer":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "receptionist":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "maintenance":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "instructor":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString('es-MX')
  }

  const formatCurrency = (amount: number) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const getInitials = (name: string) => {
    if (!name) return "N/A"
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const generateLogin = (employee: Employee) => {
    setSelectedEmployee(employee)
    setLoginForm({
      password: generateRandomPassword()
    })
    setShowLoginModal(true)
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
    if (!selectedEmployee || !loginForm.password) return

    if (loginForm.password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres")
      return
    }

    setGeneratingLogin(true)
    try {
      const response = await fetch("/api/auth/employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "create-credentials",
          employee_id: selectedEmployee.id,
          password: loginForm.password
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        toast.success("¡Credenciales creadas!", {
          description: `Email: ${selectedEmployee.email}`,
          duration: 5000
        })
        setShowLoginModal(false)
        fetchEmployees()
      } else {
        toast.error(result.error || "Error creando credenciales")
      }
    } catch (error) {
      console.error("Error creating login:", error)
      toast.error("Error creando credenciales de acceso")
    } finally {
      setGeneratingLogin(false)
    }
  }

  return (
    <AuthenticatedLayout 
      title="Empleados"
      showBackButton
      backHref="/"
      headerActions={
        <Button asChild>
          <Link href="/employees/add">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Empleado
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empleados por nombre, email, teléfono, puesto o departamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando empleados...</p>
            </div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron empleados" : "No se encontraron empleados"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No hay empleados que coincidan con "${searchTerm}". Intenta con un término diferente.`
                  : "Comienza agregando tu primer empleado."
                }
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/employees/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Empleado
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {getInitials(employee.name)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{employee.name}</h3>
                        <Badge className={getStatusColor(employee.status)} variant="secondary">
                          {employee.status === 'active' ? 'activo' : employee.status === 'inactive' ? 'inactivo' : employee.status === 'pending' ? 'pendiente' : employee.status === 'terminated' ? 'terminado' : employee.status}
                        </Badge>
                        {employee.position && (
                          <Badge className={getPositionColor(employee.position)} variant="secondary">
                            {employee.position}
                          </Badge>
                        )}
                        {employee.department && (
                          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" variant="secondary">
                            {employee.department}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{employee.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{employee.primary_phone || employee.phone}</span>
                        </div>
                        {(employee.city || employee.state) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{[employee.city, employee.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Contratado {formatDate(employee.hire_date || employee.created_at)}</span>
                        </div>
                        {employee.salary && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <span>{formatCurrency(employee.salary)}/mo</span>
                          </div>
                        )}
                        {employee.employee_id && (
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            <span>ID: {employee.employee_id}</span>
                          </div>
                        )}
                        {employee.access_level && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {employee.access_level}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Generate Login Button */}
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateLogin(employee)}
                        className="flex items-center gap-1"
                      >
                        <Key className="h-3 w-3" />
                        Generar Acceso
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Generate Login Modal */}
        {showLoginModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  Generar Acceso para {selectedEmployee.name}
                </h3>

                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    <strong>Email para iniciar sesión:</strong><br/>
                    {selectedEmployee.email}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Mínimo 8 caracteres"
                      type="text"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se generó una contraseña automáticamente. Puedes cambiarla si lo deseas.
                    </p>
                  </div>

                  <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded">
                    <strong>Nivel de Acceso:</strong> {selectedEmployee.access_level || 'No definido'}<br/>
                    <span className="text-xs">El nivel de acceso se define en el perfil del empleado.</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-6">
                  <Button
                    onClick={handleCreateLogin}
                    disabled={generatingLogin || !loginForm.password || loginForm.password.length < 8}
                    className="flex-1"
                  >
                    {generatingLogin ? "Creando..." : "Crear Acceso"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowLoginModal(false)}
                    disabled={generatingLogin}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}
