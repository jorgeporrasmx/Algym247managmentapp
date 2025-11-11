"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, DollarSign, CreditCard, Activity, Calendar, User } from "lucide-react"
import Link from "next/link"

interface Payment {
  id: string
  contract_id: string
  member_id: string
  amount: number
  payment_date: string
  payment_method: string
  status: string
  transaction_id: string
  notes: string
  created_at: string
  members?: {
    id: string
    name: string
    email: string
  }
  contracts?: {
    id: string
    contract_type: string
    monthly_fee: number
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const response = await fetch("/api/payments")
      if (response.ok) {
        const result = await response.json()
        // Handle the nested data structure from the API
        const payments = result.success ? result.data : []
        setPayments(payments)
      }
    } catch (error) {
      console.error("Error fetching payments:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "completado":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "pending":
      case "pendiente":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
      case "fallido":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
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

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "credit_card":
        return <CreditCard className="h-3 w-3" />
      case "cash":
        return <DollarSign className="h-3 w-3" />
      case "bank_transfer":
        return <Activity className="h-3 w-3" />
      default:
        return <DollarSign className="h-3 w-3" />
    }
  }

  return (
    <AuthenticatedLayout 
      title="Pagos"
      showBackButton
      backHref="/"
      headerActions={
        <Button asChild>
          <Link href="/payments/add">
            <Plus className="mr-2 h-4 w-4" />
            Registrar Pago
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando pagos...</p>
            </div>
          </div>
        ) : payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron pagos</h3>
              <p className="text-muted-foreground mb-4">Comienza registrando tu primer pago.</p>
              <Button asChild>
                <Link href="/payments/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Pago
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm">{formatCurrency(payment.amount)}</h3>
                        <Badge className={getStatusColor(payment.status)} variant="secondary">
                          {payment.status === 'completed' ? 'completado' : payment.status === 'pending' ? 'pendiente' : payment.status === 'failed' ? 'fallido' : payment.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <User className="h-3 w-3" />
                        <span>{payment.members?.name || 'Miembro Desconocido'}</span>
                        <span>•</span>
                        <span>{payment.contracts?.contract_type || 'Contrato Desconocido'}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(payment.payment_date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {getPaymentMethodIcon(payment.payment_method)}
                          <span className="capitalize">{payment.payment_method.replace('_', ' ').replace('credit card', 'tarjeta de crédito').replace('cash', 'efectivo').replace('bank transfer', 'transferencia bancaria')}</span>
                        </div>
                        {payment.transaction_id && (
                          <div className="text-xs text-muted-foreground">
                            ID: {payment.transaction_id.slice(0, 8)}...
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
