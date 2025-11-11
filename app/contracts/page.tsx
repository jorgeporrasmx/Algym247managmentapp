"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, FileText, Calendar, DollarSign, User, Search } from "lucide-react"
import Link from "next/link"

interface Contract {
  id: string
  member_id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
  created_at: string
  members?: {
    id: string
    name: string
    email: string
    status: string
  }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchContracts()
  }, [])

  useEffect(() => {
    // Filter contracts based on search term
    const filtered = contracts.filter(contract =>
      contract.contract_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.members?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.status.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredContracts(filtered)
  }, [searchTerm, contracts])

  const fetchContracts = async () => {
    try {
      const response = await fetch("/api/contracts")
      if (response.ok) {
        const result = await response.json()
        // Handle the nested data structure from the API
        const contracts = result.success ? result.data : []
        setContracts(contracts)
        setFilteredContracts(contracts)
      }
    } catch (error) {
      console.error("Error fetching contracts:", error)
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
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  return (
    <AuthenticatedLayout 
      title="Contratos"
      headerActions={
        <Button asChild>
          <Link href="/contracts/add">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Contrato
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contratos por tipo, nombre del miembro o estado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando contratos...</p>
            </div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? "No se encontraron contratos" : "No se encontraron contratos"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? `No hay contratos que coincidan con "${searchTerm}". Intenta con un término diferente.`
                  : "Comienza creando tu primer contrato."
                }
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href="/contracts/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Crear Contrato
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredContracts.map((contract) => (
              <Card key={contract.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{contract.contract_type}</h3>
                          <Badge className={getStatusColor(contract.status)} variant="secondary">
                            {contract.status === 'active' ? 'activo' : contract.status === 'inactive' ? 'inactivo' : contract.status === 'pending' ? 'pendiente' : contract.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <User className="h-3 w-3" />
                          <span>{contract.members?.name || 'Miembro Desconocido'}</span>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(contract.start_date)} - {formatDate(contract.end_date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            <span>{formatCurrency(contract.monthly_fee)}</span>
                          </div>
                        </div>
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
