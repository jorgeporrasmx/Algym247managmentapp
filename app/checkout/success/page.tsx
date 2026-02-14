"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { CheckCircle, Package, ArrowLeft, Receipt } from "lucide-react"
import Link from "next/link"

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams()
  const orderId = searchParams.get("order")
  const [orderDetails, setOrderDetails] = useState<{
    id: string;
    transaction_id: string;
    total: number;
    items: unknown[];
    created_at: string;
  } | null>(null)

  useEffect(() => {
    if (orderId) {
      // In a real app, you would fetch order details from the API
      setOrderDetails({
        id: orderId,
        transaction_id: "txn_" + Math.random().toString(36).substr(2, 9),
        total: 0,
        items: [],
        created_at: new Date().toISOString()
      })
    }
  }, [orderId])

  return (
    <AuthenticatedLayout 
      title="Compra Completada"
      showBackButton={false}
    >
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-600">
              ¡Compra Exitosa!
            </CardTitle>
            <p className="text-muted-foreground">
              Tu pedido ha sido procesado correctamente
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {orderDetails && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Detalles del Pedido</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Número de Orden:</span>
                    <span className="font-mono">{orderDetails.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ID de Transacción:</span>
                    <span className="font-mono">{orderDetails.transaction_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fecha:</span>
                    <span>{new Date(orderDetails.created_at).toLocaleDateString('es-MX')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="flex-1">
                <Link href="/pos">
                  <Package className="mr-2 h-4 w-4" />
                  Nueva Venta
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ver Productos
                </Link>
              </Button>
            </div>

            <div className="pt-4 border-t text-center">
              <Button variant="ghost" size="sm">
                <Receipt className="mr-2 h-4 w-4" />
                Descargar Recibo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}