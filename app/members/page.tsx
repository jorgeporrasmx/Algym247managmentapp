"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, Users, Mail, Phone, Calendar, Search, MapPin, CreditCard, User } from "lucide-react"
import Link from "next/link"

interface Member {
  id: string
  name: string
  email: string
  phone: string
  primary_phone: string
  status: string
  created_at: string
  first_name: string
  paternal_last_name: string
  selected_plan: string
  monthly_amount: number
  city: string
  state: string
  start_date: string
  expiration_date: string
  employee: string
  access_type: string
  direct_debit: string
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    // Filter members based on search term
    const filtered = members.filter(member =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.primary_phone && member.primary_phone.includes(searchTerm)) ||
      (member.first_name && member.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (member.paternal_last_name && member.paternal_last_name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredMembers(filtered)
  }, [searchTerm, members])

  const fetchMembers = async () => {
    try {
      const response = await fetch("/api/members")
      if (response.ok) {
        const result = await response.json()
        // Handle the nested data structure from the API
        const members = result.success ? result.data : []
        setMembers(members)
        setFilteredMembers(members)
      }
    } catch (error) {
      console.error("Error fetching members:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case "vip":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      case "premium":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "basic":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      case "student":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "senior":
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

  return (
    <AuthenticatedLayout 
      title="Socios"
      showBackButton
      backHref="/"
      headerActions={
        <Button asChild>
          <Link href="/members/add">
            <Plus className="mr-2 h-4 w-4" />
            Agregar Socio
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar socios por nombre, correo, teléfono o ubicación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando socios...</p>
            </div>
          </div>
        ) : filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron socios" : "No hay socios"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No hay socios que coincidan con "${searchTerm}". Intenta con otro término de búsqueda.`
                  : "Comienza agregando tu primer socio."
                }
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/members/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Socio
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {getInitials(member.name)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                        <Badge className={getStatusColor(member.status)} variant="secondary">
                          {member.status}
                        </Badge>
                        {member.selected_plan && (
                          <Badge className={getPlanColor(member.selected_plan)} variant="secondary">
                            {member.selected_plan}
                          </Badge>
                        )}
                        {member.employee && (
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" variant="secondary">
                            {member.employee}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{member.email}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          <span>{member.primary_phone || member.phone}</span>
                        </div>
                        {(member.city || member.state) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{[member.city, member.state].filter(Boolean).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Se unió {formatDate(member.start_date || member.created_at)}</span>
                        </div>
                        {member.monthly_amount && (
                          <div className="flex items-center gap-1">
                            <CreditCard className="h-3 w-3" />
                            <span>{formatCurrency(member.monthly_amount)}/mes</span>
                          </div>
                        )}
                        {member.expiration_date && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>Vence {formatDate(member.expiration_date)}</span>
                          </div>
                        )}
                        {member.access_type && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {member.access_type}
                            </span>
                          </div>
                        )}
                        {member.direct_debit && (
                          <div className="flex items-center gap-1">
                            <span className={`text-xs px-2 py-1 rounded ${
                              member.direct_debit === 'Domiciliado' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                              {member.direct_debit}
                            </span>
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
