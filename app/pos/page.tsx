"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { useCart } from "@/components/cart-provider"
import { 
  Search, ShoppingCart, Plus, Minus, Trash2, 
  DollarSign, CreditCard, Banknote, Package,
  User, UserPlus
} from "lucide-react"
import { fetchJSON, handleAPIError } from "@/lib/http-utils"

interface Product {
  id: string
  product_id: string
  name: string
  brand?: string
  category?: string
  price: number
  stock: number
}

export default function POSPage() {
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart, setIsCartOpen } = useCart()
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(p => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.product_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredProducts(filtered.slice(0, 5))
    } else {
      setFilteredProducts([])
    }
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      const result = await fetchJSON<{ success: boolean; data: Product[] }>("/api/products")
      const list = result.success ? result.data : []
      setProducts(list)
    } catch (error) {
      console.error("Error fetching products", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const handleQuickAdd = (product: Product) => {
    addToCart(product)
    setSearchTerm("")
  }

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      alert("El carrito está vacío")
      return
    }

    const saleData = {
      items: cart.items,
      total: cart.total,
      payment_method: paymentMethod,
      member_id: selectedMember?.id || null,
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData)
      })

      if (response.ok) {
        alert("Venta completada exitosamente")
        clearCart()
        setSelectedMember(null)
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      alert("Error al procesar la venta")
    }
  }

  const popularProducts = products
    .filter(p => p.stock > 0)
    .slice(0, 8)

  return (
    <AuthenticatedLayout
      title="Punto de Venta"
      showBackButton
      backHref="/"
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Ver Carrito
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Product Selection */}
        <div className="space-y-4">
          {/* Search Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar producto por nombre, código o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {filteredProducts.length > 0 && (
                <div className="mt-2 border rounded-lg divide-y">
                  {filteredProducts.map(product => (
                    <div 
                      key={product.id}
                      className="p-3 hover:bg-muted cursor-pointer flex items-center justify-between"
                      onClick={() => handleQuickAdd(product)}
                    >
                      <div>
                        <p className="font-medium text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.brand} • Stock: {product.stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Popular Products */}
          <Card>
            <CardHeader>
              <CardTitle>Productos Populares</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {loading ? (
                  <p className="col-span-full text-center text-muted-foreground">Cargando...</p>
                ) : popularProducts.length === 0 ? (
                  <p className="col-span-full text-center text-muted-foreground">No hay productos disponibles</p>
                ) : (
                  popularProducts.map(product => (
                    <Button
                      key={product.id}
                      variant="outline"
                      className="h-auto p-4 flex-col gap-2"
                      onClick={() => handleQuickAdd(product)}
                    >
                      <Package className="h-5 w-5" />
                      <span className="text-xs font-medium text-center">{product.name}</span>
                      <span className="text-xs text-muted-foreground">{formatCurrency(product.price)}</span>
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart and Checkout */}
        <div className="space-y-4">
          {/* Cart Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Carrito</span>
                {cart.itemCount > 0 && (
                  <Badge variant="secondary">{cart.itemCount} items</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto">
              {cart.items.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Carrito vacío
                </p>
              ) : (
                <div className="space-y-3">
                  {cart.items.map(item => (
                    <div key={item.product_id} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.max_stock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {cart.items.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive"
                      onClick={clearCart}
                    >
                      Vaciar Carrito
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("cash")}
                  className="flex-col gap-2 h-auto py-3"
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs">Efectivo</span>
                </Button>
                <Button
                  variant={paymentMethod === "card" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("card")}
                  className="flex-col gap-2 h-auto py-3"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs">Tarjeta</span>
                </Button>
                <Button
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  onClick={() => setPaymentMethod("transfer")}
                  className="flex-col gap-2 h-auto py-3"
                >
                  <DollarSign className="h-5 w-5" />
                  <span className="text-xs">Transfer</span>
                </Button>
              </div>

              {/* Customer Selection */}
              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setSelectedMember(null)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {selectedMember ? selectedMember.name : "Cliente General"}
                  </Button>
                  <Button variant="outline" size="icon">
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checkout */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cart.total)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-lg">{formatCurrency(cart.total)}</span>
                </div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.items.length === 0}
                >
                  <DollarSign className="mr-2 h-5 w-5" />
                  Completar Venta
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}