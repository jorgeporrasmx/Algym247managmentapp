"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, Package, Search, Tag, DollarSign, Factory, BarChart3, Store, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { fetchJSON, handleAPIError } from "@/lib/http-utils"
import { useCart } from "@/components/cart-provider"

interface Product {
  id: string
  product_id: string
  name: string
  brand?: string
  type?: string
  category?: string
  supplier?: string
  supplier_email?: string
  supplier_website?: string
  gym?: string
  price: number
  cost: number
  quantity: string
  stock: string
  sold_this_month: string
  total_sold_amount: number
  last_sale?: string
  payment_method?: string
  sale_status?: string
  created_at?: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filtered, setFiltered] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const { addToCart, setIsCartOpen } = useCart()

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const s = searchTerm.toLowerCase()
    setFiltered(
      products.filter(p =>
        p.name?.toLowerCase().includes(s) ||
        p.product_id?.toLowerCase().includes(s) ||
        p.brand?.toLowerCase().includes(s) ||
        p.category?.toLowerCase().includes(s)
      )
    )
  }, [searchTerm, products])

  const fetchProducts = async () => {
    try {
      const result = await fetchJSON<{ success: boolean; data: Product[] }>("/api/products")
      const list = result.success ? result.data : []
      setProducts(list)
      setFiltered(list)
    } catch (error) {
      console.error("Error fetching products", error)
      const errorMessage = handleAPIError(error)
      console.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(n || 0)

  const handleAddToCart = (product: Product) => {
    addToCart(product)
  }

  return (
    <AuthenticatedLayout
      title="Productos"
      showBackButton
      backHref="/"
      headerActions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Carrito
          </Button>
          <Button asChild>
            <Link href="/products/add">
              <Plus className="mr-2 h-4 w-4" />
              Agregar Producto
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, ID, marca, categoría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No se encontraron productos.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map(product => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{product.name}</h3>
                          {product.sale_status && (
                            <Badge variant="secondary">{product.sale_status}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">ID: {product.product_id}</div>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {product.brand && (
                            <span className="inline-flex items-center gap-1"><Factory className="h-3 w-3" /> {product.brand}</span>
                          )}
                          {product.category && (
                            <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" /> {product.category}</span>
                          )}
                          {product.gym && (
                            <span className="inline-flex items-center gap-1"><Store className="h-3 w-3" /> {product.gym}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-end gap-4 text-right">
                        <div>
                          <div className="text-xs text-muted-foreground">Precio</div>
                          <div className="font-semibold text-sm flex items-center gap-1 justify-end"><DollarSign className="h-3 w-3" />{formatCurrency(product.price)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Inventario</div>
                          <div className="font-semibold text-sm">{product.stock}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Vendido</div>
                          <div className="font-semibold text-sm inline-flex items-center gap-1"><BarChart3 className="h-3 w-3" />{product.sold_this_month || '0'}</div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleAddToCart(product)}
                        disabled={!product.stock || Number(product.stock) <= 0}
                      >
                        <ShoppingCart className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
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


