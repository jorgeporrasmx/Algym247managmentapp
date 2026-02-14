"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { FinancialProtectedSection } from "@/components/ui/protected-section"
import { GoogleSheetsService } from "@/lib/google-sheets"
import { Product, DailyMetrics } from "@/lib/types/inventory"
import { 
  ShoppingCart, Package, TrendingUp, AlertTriangle, 
  DollarSign, CreditCard, Banknote, ArrowUp,
  Plus, Minus, Calendar, CalendarDays, ChevronLeft, ChevronRight
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetrics | null>(null)
  const [periodMetrics, setPeriodMetrics] = useState<{
    period: string;
    period_label: string;
    start_date: string;
    end_date: string;
    days_count?: number;
    daily_average?: number;
    total_sales: number;
    transaction_count: number;
    avg_ticket: number;
    cash_sales: number;
    card_sales: number;
    transfer_sales: number;
    product_sales: number;
    service_sales: number;
    combo_sales: number;
    top_products: Array<{ product_name: string; quantity_sold: number; revenue: number }>;
  } | null>(null)
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomRange, setShowCustomRange] = useState(false)
  
  // Quick Sale State
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [quantity, setQuantity] = useState(1)
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "transfer">("cash")
  const [saleType, setSaleType] = useState<"product" | "service" | "combo">("product")
  const [processing, setProcessing] = useState(false)

  const sheetsService = GoogleSheetsService.getInstance()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    try {
      const [productsData, metricsData, periodData, lowStockData] = await Promise.all([
        sheetsService.getProducts(),
        sheetsService.getDailyMetrics(),
        sheetsService.getMetricsByPeriod(selectedPeriod === 'custom' ? 'month' : selectedPeriod, selectedDate.toISOString().split('T')[0]),
        sheetsService.getLowStockProducts()
      ])
      
      setProducts(productsData)
      setDailyMetrics(metricsData)
      setPeriodMetrics(periodData)
      setLowStockProducts(lowStockData)
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = async (newPeriod: 'day' | 'week' | 'month' | 'year' | 'custom') => {
    setSelectedPeriod(newPeriod)
    setShowCustomRange(newPeriod === 'custom')
    
    if (newPeriod !== 'custom') {
      try {
        const periodData = await sheetsService.getMetricsByPeriod(newPeriod, selectedDate.toISOString().split('T')[0])
        setPeriodMetrics(periodData)
      } catch (error) {
        console.error("Error loading period data:", error)
      }
    }
  }

  const handleDateChange = async (newDate: Date) => {
    setSelectedDate(newDate)
    if (selectedPeriod !== 'custom') {
      try {
        const periodData = await sheetsService.getMetricsByPeriod(selectedPeriod, newDate.toISOString().split('T')[0])
        setPeriodMetrics(periodData)
      } catch (error) {
        console.error("Error loading period data:", error)
      }
    }
  }

  const handleCustomRangeSubmit = async () => {
    if (!customStartDate || !customEndDate) {
      alert("Por favor selecciona ambas fechas")
      return
    }
    
    if (new Date(customStartDate) > new Date(customEndDate)) {
      alert("La fecha de inicio debe ser menor a la fecha de fin")
      return
    }

    try {
      const customData = await sheetsService.getCustomRangeMetrics(customStartDate, customEndDate)
      setPeriodMetrics(customData)
    } catch (error) {
      console.error("Error loading custom range data:", error)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    handleDateChange(newDate)
  }

  const navigateYear = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    if (direction === 'prev') {
      newDate.setFullYear(newDate.getFullYear() - 1)
    } else {
      newDate.setFullYear(newDate.getFullYear() + 1)
    }
    handleDateChange(newDate)
  }

  const handleQuickSale = async () => {
    if (!selectedProduct || quantity <= 0) return

    setProcessing(true)
    try {
      const product = products.find(p => p.id === selectedProduct)
      if (!product) return

      if (product.stock < quantity) {
        alert(`Stock insuficiente. Solo hay ${product.stock} disponibles.`)
        return
      }

      await sheetsService.addSale({
        date: new Date().toISOString().split('T')[0],
        product_id: product.id,
        product_name: product.name,
        quantity: quantity,
        unit_price: product.price,
        total: product.price * quantity,
        payment_method: paymentMethod,
        sale_type: saleType,
        employee: "Empleado" // En producción, obtener del contexto de usuario
      })

      // Reset form
      setSelectedProduct("")
      setQuantity(1)
      
      // Reload data
      await loadData()
      
      alert("¡Venta registrada exitosamente!")
    } catch (error) {
      console.error("Error registering sale:", error)
      alert("Error al registrar la venta")
    } finally {
      setProcessing(false)
    }
  }

  const handleStockUpdate = async (productId: string, change: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const newStock = Math.max(0, product.stock + change)
    
    if (change > 0) {
      await sheetsService.addStock(productId, change, "Entrada manual")
    } else {
      await sheetsService.updateProductStock(productId, newStock)
    }
    
    await loadData()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount)
  }

  const getStockColor = (product: Product) => {
    const threshold = product.price < 200 ? 5 : 2
    if (product.stock < threshold) return "text-red-600 bg-red-50"
    if (product.stock < threshold * 2) return "text-yellow-600 bg-yellow-50"
    return "text-green-600 bg-green-50"
  }

  if (loading) {
    return (
      <AuthenticatedLayout title="Inventario" showBackButton backHref="/">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">Cargando inventario...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout 
      title="Inventario y Ventas"
      showBackButton
      backHref="/"
    >
      <Tabs defaultValue="sale" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sale">Nueva Venta</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
        </TabsList>

        {/* NUEVA VENTA - TAB 1 */}
        <TabsContent value="sale" className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FinancialProtectedSection>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Ventas Hoy</p>
                      <p className="text-lg font-bold">{formatCurrency(dailyMetrics?.total_sales || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FinancialProtectedSection>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                    <p className="text-lg font-bold">{dailyMetrics?.transaction_count || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Stock Bajo</p>
                    <p className="text-lg font-bold text-red-600">{lowStockProducts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Productos</p>
                    <p className="text-lg font-bold">{products.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Sale Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Registrar Venta Rápida</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo de Venta</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={saleType === "product" ? "default" : "outline"}
                        onClick={() => setSaleType("product")}
                        className="text-xs"
                      >
                        Producto
                      </Button>
                      <Button
                        variant={saleType === "service" ? "default" : "outline"}
                        onClick={() => setSaleType("service")}
                        className="text-xs"
                      >
                        Servicio
                      </Button>
                      <Button
                        variant={saleType === "combo" ? "default" : "outline"}
                        onClick={() => setSaleType("combo")}
                        className="text-xs"
                      >
                        Combo
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Producto</label>
                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{product.name}</span>
                              <div className="ml-4 text-xs text-muted-foreground">
                                Stock: {product.stock} | {formatCurrency(product.price)}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Cantidad</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 text-center"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Método de Pago</label>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant={paymentMethod === "cash" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("cash")}
                        className="flex-col gap-1 h-16"
                      >
                        <Banknote className="h-5 w-5" />
                        <span className="text-xs">Efectivo</span>
                      </Button>
                      <Button
                        variant={paymentMethod === "card" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("card")}
                        className="flex-col gap-1 h-16"
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="text-xs">Tarjeta</span>
                      </Button>
                      <Button
                        variant={paymentMethod === "transfer" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("transfer")}
                        className="flex-col gap-1 h-16"
                      >
                        <DollarSign className="h-5 w-5" />
                        <span className="text-xs">Transfer</span>
                      </Button>
                    </div>
                  </div>

                  {/* Total and Action */}
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <span className="text-2xl font-bold">
                        {selectedProduct ? 
                          formatCurrency((products.find(p => p.id === selectedProduct)?.price || 0) * quantity) : 
                          formatCurrency(0)
                        }
                      </span>
                    </div>
                    
                    <Button 
                      className="w-full h-12 text-lg" 
                      onClick={handleQuickSale}
                      disabled={!selectedProduct || processing}
                    >
                      {processing ? "Procesando..." : "REGISTRAR VENTA"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Stock Bajo - {lowStockProducts.length} productos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>
                        <span className="font-medium">{product.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          Stock: {product.stock} | Mínimo: {product.price < 200 ? 5 : 2}
                        </span>
                      </div>
                      <Badge variant="destructive">{product.stock}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* INVENTARIO - TAB 2 */}
        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Control de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.map(product => (
                  <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.category} • {formatCurrency(product.price)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStockColor(product)}`}>
                        Stock: {product.stock}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockUpdate(product.id, -1)}
                          disabled={product.stock <= 0}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockUpdate(product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStockUpdate(product.id, 10)}
                        >
                          <ArrowUp className="h-3 w-3" />
                          10
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÉTRICAS - TAB 3 */}
        <TabsContent value="metrics" className="space-y-6">
          <FinancialProtectedSection>
          {/* Period Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Métricas de Ventas</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Día</SelectItem>
                      <SelectItem value="week">Semana</SelectItem>
                      <SelectItem value="month">Mes</SelectItem>
                      <SelectItem value="year">Año</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
              
              {/* Date Navigation for Month/Year */}
              {(selectedPeriod === 'month' || selectedPeriod === 'year') && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedPeriod === 'month' ? navigateMonth('prev') : navigateYear('prev')}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-center min-w-[200px]">
                      <p className="font-medium">
                        {selectedPeriod === 'month' 
                          ? selectedDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
                          : selectedDate.getFullYear()
                        }
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedPeriod === 'month' ? navigateMonth('next') : navigateYear('next')}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateChange(new Date())}
                  >
                    Hoy
                  </Button>
                </div>
              )}

              {/* Day Navigation */}
              {selectedPeriod === 'day' && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() - 1)
                        handleDateChange(newDate)
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-center min-w-[200px]">
                      <p className="font-medium">
                        {selectedDate.toLocaleDateString('es-MX', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() + 1)
                        handleDateChange(newDate)
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateChange(new Date())}
                  >
                    Hoy
                  </Button>
                </div>
              )}

              {/* Week Navigation */}
              {selectedPeriod === 'week' && (
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() - 7)
                        handleDateChange(newDate)
                      }}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="text-center min-w-[250px]">
                      <p className="font-medium text-sm">
                        {(() => {
                          const startOfWeek = new Date(selectedDate)
                          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
                          const endOfWeek = new Date(startOfWeek)
                          endOfWeek.setDate(startOfWeek.getDate() + 6)
                          return `Semana del ${startOfWeek.getDate()} al ${endOfWeek.getDate()} de ${startOfWeek.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`
                        })()}
                      </p>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newDate = new Date(selectedDate)
                        newDate.setDate(newDate.getDate() + 7)
                        handleDateChange(newDate)
                      }}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDateChange(new Date())}
                  >
                    Esta Semana
                  </Button>
                </div>
              )}

              {/* Custom Range Selector */}
              {showCustomRange && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-3">Seleccionar Rango Personalizado</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fecha Inicio</label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Fecha Fin</label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <Button onClick={handleCustomRangeSubmit} className="w-full">
                      Generar Reporte
                    </Button>
                  </div>
                </div>
              )}

              {periodMetrics && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm font-medium text-primary">
                    📊 {periodMetrics.period_label}
                  </p>
                  {periodMetrics.period === 'custom' && periodMetrics.daily_average && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Promedio diario: {formatCurrency(periodMetrics.daily_average)}
                    </p>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Main Sales Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Ventas Totales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {formatCurrency(periodMetrics?.total_sales || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Transacciones:</span>
                    <span className="font-medium">{periodMetrics?.transaction_count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ticket Promedio:</span>
                    <span className="font-medium">{formatCurrency(periodMetrics?.avg_ticket || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  Métodos de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Efectivo</span>
                  </div>
                  <span className="font-medium">{formatCurrency(periodMetrics?.cash_sales || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Tarjeta</span>
                  </div>
                  <span className="font-medium">{formatCurrency(periodMetrics?.card_sales || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Transferencia</span>
                  </div>
                  <span className="font-medium">{formatCurrency(periodMetrics?.transfer_sales || 0)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Sales by Type */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Ventas por Tipo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Productos</span>
                  <span className="font-medium">{formatCurrency(periodMetrics?.product_sales || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Servicios</span>
                  <span className="font-medium">{formatCurrency(periodMetrics?.service_sales || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Combos</span>
                  <span className="font-medium">{formatCurrency(periodMetrics?.combo_sales || 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Products */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  Productos Más Vendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {periodMetrics?.top_products?.length ? (
                    periodMetrics.top_products.map((product: { product_name: string; quantity_sold: number; revenue: number }, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{product.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              Cantidad: {product.quantity_sold}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold">{formatCurrency(product.revenue)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No hay ventas en este período
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Today's Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-blue-600" />
                  Resumen de Hoy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(dailyMetrics?.total_sales || 0)}
                    </p>
                    <p className="text-xs text-green-600">Ventas</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">
                      {dailyMetrics?.transaction_count || 0}
                    </p>
                    <p className="text-xs text-blue-600">Transacciones</p>
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium">Productos Vendidos Hoy</h4>
                  {dailyMetrics?.top_products?.length ? (
                    dailyMetrics.top_products.slice(0, 3).map((product, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="truncate">{product.product_name}</span>
                        <span className="font-medium">x{product.quantity_sold}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">No hay ventas hoy</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </FinancialProtectedSection>
        </TabsContent>
      </Tabs>
    </AuthenticatedLayout>
  )
}