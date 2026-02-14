"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// Select components available if needed for payment method selection
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { useCart } from "@/components/cart-provider"
import { useRouter } from "next/navigation"
import { 
  ShoppingCart, CreditCard, DollarSign, Banknote, 
  User, Mail, Phone, MapPin, CheckCircle
} from "lucide-react"

export default function CheckoutPage() {
  const { cart, clearCart } = useCart()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_address: "",
    payment_method: "cash",
    card_number: "",
    card_name: "",
    card_expiry: "",
    card_cvv: ""
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)

    const saleData = {
      items: cart.items,
      total: cart.total,
      customer: {
        name: formData.customer_name,
        email: formData.customer_email,
        phone: formData.customer_phone,
        address: formData.customer_address
      },
      payment_method: formData.payment_method,
      payment_details: formData.payment_method === "card" ? {
        card_number: formData.card_number.slice(-4),
        card_name: formData.card_name
      } : null
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        const result = await response.json()
        clearCart()
        router.push(`/checkout/success?order=${result.id}`)
      } else {
        const error = await response.json()
        alert(`Error al procesar el pago: ${error.message}`)
      }
    } catch (error) {
      console.error("Error processing checkout:", error)
      alert("Error al procesar el pago")
    } finally {
      setProcessing(false)
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  if (cart.items.length === 0) {
    return (
      <AuthenticatedLayout title="Checkout" showBackButton backHref="/products">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tu carrito está vacío</h3>
            <p className="text-muted-foreground mb-4">Agrega productos antes de proceder al checkout.</p>
            <Button onClick={() => router.push("/products")}>
              Ver Productos
            </Button>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout 
      title="Checkout"
      showBackButton
      backHref="/products"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Checkout Form */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Información del Cliente</CardTitle>
                <CardDescription>Ingresa los datos del cliente para la factura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">
                      <User className="inline h-3 w-3 mr-1" />
                      Nombre Completo
                    </Label>
                    <Input 
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => updateField("customer_name", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">
                      <Mail className="inline h-3 w-3 mr-1" />
                      Email
                    </Label>
                    <Input 
                      id="customer_email"
                      type="email"
                      value={formData.customer_email}
                      onChange={(e) => updateField("customer_email", e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">
                      <Phone className="inline h-3 w-3 mr-1" />
                      Teléfono
                    </Label>
                    <Input 
                      id="customer_phone"
                      type="tel"
                      value={formData.customer_phone}
                      onChange={(e) => updateField("customer_phone", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_address">
                      <MapPin className="inline h-3 w-3 mr-1" />
                      Dirección
                    </Label>
                    <Input 
                      id="customer_address"
                      value={formData.customer_address}
                      onChange={(e) => updateField("customer_address", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Método de Pago</CardTitle>
                <CardDescription>Selecciona cómo deseas pagar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={formData.payment_method === "cash" ? "default" : "outline"}
                    onClick={() => updateField("payment_method", "cash")}
                    className="flex-col gap-2 h-auto py-4"
                  >
                    <Banknote className="h-5 w-5" />
                    <span className="text-xs">Efectivo</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.payment_method === "card" ? "default" : "outline"}
                    onClick={() => updateField("payment_method", "card")}
                    className="flex-col gap-2 h-auto py-4"
                  >
                    <CreditCard className="h-5 w-5" />
                    <span className="text-xs">Tarjeta</span>
                  </Button>
                  <Button
                    type="button"
                    variant={formData.payment_method === "transfer" ? "default" : "outline"}
                    onClick={() => updateField("payment_method", "transfer")}
                    className="flex-col gap-2 h-auto py-4"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Transferencia</span>
                  </Button>
                </div>

                {formData.payment_method === "card" && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label htmlFor="card_number">Número de Tarjeta</Label>
                      <Input 
                        id="card_number"
                        placeholder="1234 5678 9012 3456"
                        value={formData.card_number}
                        onChange={(e) => updateField("card_number", e.target.value)}
                        maxLength={19}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="card_name">Nombre en la Tarjeta</Label>
                      <Input 
                        id="card_name"
                        placeholder="JUAN PEREZ"
                        value={formData.card_name}
                        onChange={(e) => updateField("card_name", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="card_expiry">Fecha de Expiración</Label>
                        <Input 
                          id="card_expiry"
                          placeholder="MM/YY"
                          value={formData.card_expiry}
                          onChange={(e) => updateField("card_expiry", e.target.value)}
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card_cvv">CVV</Label>
                        <Input 
                          id="card_cvv"
                          placeholder="123"
                          value={formData.card_cvv}
                          onChange={(e) => updateField("card_cvv", e.target.value)}
                          maxLength={4}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </form>
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {cart.items.map((item) => (
                  <div key={item.product_id} className="flex justify-between text-sm">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="font-medium">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Envío</span>
                  <span>Gratis</span>
                </div>
                <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(cart.total)}</span>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSubmit}
                disabled={processing}
              >
                {processing ? (
                  <>Procesando...</>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Completar Compra
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Al completar la compra aceptas nuestros términos y condiciones
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}