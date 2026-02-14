import { Product, Sale, StockMovement } from "@/lib/types/inventory"
import { MondayAPIService } from "@/lib/monday-api"

// Service that integrates with Monday.com API for real data
export class GoogleSheetsService {
  private static instance: GoogleSheetsService
  private products: Product[] = []
  private sales: Sale[] = []
  private stockMovements: StockMovement[] = []
  private mondayService: MondayAPIService

  constructor() {
    this.mondayService = MondayAPIService.getInstance()
    this.initMockData()
  }

  static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService()
    }
    return GoogleSheetsService.instance
  }

  private initMockData() {
    // Mock products data
    this.products = [
      {
        id: "P001",
        name: "Proteína Whey Chocolate",
        price: 899,
        stock: 12,
        stock_minimum: 5,
        category: "Suplementos"
      },
      {
        id: "P002", 
        name: "Creatina Monohidrato",
        price: 450,
        stock: 3,
        stock_minimum: 5,
        category: "Suplementos"
      },
      {
        id: "P003",
        name: "Shaker Premium",
        price: 180,
        stock: 25,
        stock_minimum: 10,
        category: "Accesorios"
      },
      {
        id: "P004",
        name: "Guantes de Entrenamiento",
        price: 350,
        stock: 1,
        stock_minimum: 2,
        category: "Accesorios"
      },
      {
        id: "P005",
        name: "Toalla Deportiva",
        price: 120,
        stock: 15,
        stock_minimum: 8,
        category: "Accesorios"
      }
    ]

    // Mock recent sales
    this.sales = [
      {
        id: "S001",
        date: new Date().toISOString().split('T')[0],
        product_id: "P001",
        product_name: "Proteína Whey Chocolate",
        quantity: 1,
        unit_price: 899,
        total: 899,
        payment_method: "card",
        sale_type: "product",
        employee: "Recepcionista"
      },
      {
        id: "S002",
        date: new Date().toISOString().split('T')[0],
        product_id: "P003",
        product_name: "Shaker Premium",
        quantity: 2,
        unit_price: 180,
        total: 360,
        payment_method: "cash",
        sale_type: "product",
        employee: "Recepcionista"
      }
    ]
  }

  // Products methods
  async getProducts(): Promise<Product[]> {
    try {
      // Try to get real data from Monday first
      const mondayProducts = await this.mondayService.getProducts()
      if (mondayProducts.length > 0) {
        this.products = mondayProducts
        return [...mondayProducts]
      }
    } catch (error) {
      console.error("Error fetching from Monday, using mock data:", error)
    }
    
    // Fallback to mock data
    return [...this.products]
  }

  async addProduct(product: Omit<Product, 'id'>): Promise<Product> {
    const newProduct: Product = {
      ...product,
      id: `P${String(this.products.length + 1).padStart(3, '0')}`
    }
    this.products.push(newProduct)
    return newProduct
  }

  async updateProductStock(productId: string, newStock: number): Promise<boolean> {
    const productIndex = this.products.findIndex(p => p.id === productId)
    if (productIndex === -1) return false
    
    this.products[productIndex].stock = newStock
    return true
  }

  async getProduct(productId: string): Promise<Product | null> {
    return this.products.find(p => p.id === productId) || null
  }

  // Sales methods
  async addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
    try {
      // Try to add sale to Monday first
      const mondaySale = await this.mondayService.addSale(sale)
      this.sales.push(mondaySale)
      return mondaySale
    } catch (error) {
      console.error("Error adding sale to Monday, using local storage:", error)
      
      // Fallback to local storage
      const newSale: Sale = {
        ...sale,
        id: `S${String(this.sales.length + 1).padStart(3, '0')}`
      }
      this.sales.push(newSale)

      // Update product stock locally
      await this.updateProductStock(sale.product_id, 
        (await this.getProduct(sale.product_id))!.stock - sale.quantity
      )

      // Add stock movement
      await this.addStockMovement({
        date: sale.date,
        product_id: sale.product_id,
        product_name: sale.product_name,
        type: "salida",
        quantity: sale.quantity,
        resulting_stock: (await this.getProduct(sale.product_id))!.stock,
        reason: "Venta"
      })

      return newSale
    }
  }

  async getSales(startDate?: string, endDate?: string): Promise<Sale[]> {
    let filteredSales = [...this.sales]
    
    if (startDate) {
      filteredSales = filteredSales.filter(sale => sale.date >= startDate)
    }
    
    if (endDate) {
      filteredSales = filteredSales.filter(sale => sale.date <= endDate)
    }
    
    return filteredSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  // Stock movements methods
  async addStockMovement(movement: Omit<StockMovement, 'id'>): Promise<StockMovement> {
    const newMovement: StockMovement = {
      ...movement,
      id: `M${String(this.stockMovements.length + 1).padStart(3, '0')}`
    }
    this.stockMovements.push(newMovement)
    return newMovement
  }

  async addStock(productId: string, quantity: number, reason: string = "Reposición"): Promise<boolean> {
    const product = await this.getProduct(productId)
    if (!product) return false

    const newStock = product.stock + quantity
    await this.updateProductStock(productId, newStock)

    await this.addStockMovement({
      date: new Date().toISOString().split('T')[0],
      product_id: productId,
      product_name: product.name,
      type: "entrada",
      quantity: quantity,
      resulting_stock: newStock,
      reason: reason
    })

    return true
  }

  // Analytics methods
  async getDailyMetrics(date: string = new Date().toISOString().split('T')[0]) {
    const dailySales = await this.getSales(date, date)
    
    const totalSales = dailySales.reduce((sum, sale) => sum + sale.total, 0)
    const transactionCount = dailySales.length
    
    const cashSales = dailySales
      .filter(sale => sale.payment_method === "cash")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const cardSales = dailySales
      .filter(sale => sale.payment_method === "card")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const transferSales = dailySales
      .filter(sale => sale.payment_method === "transfer")
      .reduce((sum, sale) => sum + sale.total, 0)

    // Top products sold today
    const productSales: { [key: string]: { quantity: number, revenue: number, name: string } } = {}
    
    dailySales.forEach(sale => {
      if (!productSales[sale.product_id]) {
        productSales[sale.product_id] = {
          quantity: 0,
          revenue: 0,
          name: sale.product_name
        }
      }
      productSales[sale.product_id].quantity += sale.quantity
      productSales[sale.product_id].revenue += sale.total
    })

    const topProducts = Object.entries(productSales)
      .map(([_productId, data]) => ({
        product_name: data.name,
        quantity_sold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      date,
      total_sales: totalSales,
      transaction_count: transactionCount,
      cash_sales: cashSales,
      card_sales: cardSales,
      transfer_sales: transferSales,
      top_products: topProducts
    }
  }

  async getMetricsByPeriod(period: 'day' | 'week' | 'month' | 'year', date?: string) {
    const currentDate = date ? new Date(date) : new Date()
    let startDate: string
    let endDate: string
    let periodLabel: string

    switch (period) {
      case 'day':
        startDate = endDate = currentDate.toISOString().split('T')[0]
        periodLabel = currentDate.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
        break
      
      case 'week':
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        
        startDate = startOfWeek.toISOString().split('T')[0]
        endDate = endOfWeek.toISOString().split('T')[0]
        periodLabel = `Semana del ${startOfWeek.getDate()} al ${endOfWeek.getDate()} de ${startOfWeek.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`
        break
      
      case 'month':
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        startDate = startOfMonth.toISOString().split('T')[0]
        endDate = endOfMonth.toISOString().split('T')[0]
        periodLabel = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
        break
      
      case 'year':
        const startOfYear = new Date(currentDate.getFullYear(), 0, 1)
        const endOfYear = new Date(currentDate.getFullYear(), 11, 31)
        
        startDate = startOfYear.toISOString().split('T')[0]
        endDate = endOfYear.toISOString().split('T')[0]
        periodLabel = currentDate.getFullYear().toString()
        break
      
      default:
        throw new Error('Invalid period')
    }

    // Generate mock data for different periods if no real data exists
    const periodSales = await this.getSales(startDate, endDate)
    
    // Add some mock data for demonstration if sales are empty
    if (periodSales.length === 0 && period !== 'day') {
      const mockSales = this.generateMockPeriodSales(period, startDate, endDate)
      periodSales.push(...mockSales)
    }
    
    const totalSales = periodSales.reduce((sum, sale) => sum + sale.total, 0)
    const transactionCount = periodSales.length
    
    const cashSales = periodSales
      .filter(sale => sale.payment_method === "cash")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const cardSales = periodSales
      .filter(sale => sale.payment_method === "card")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const transferSales = periodSales
      .filter(sale => sale.payment_method === "transfer")
      .reduce((sum, sale) => sum + sale.total, 0)

    // Calculate sales by type
    const productSales = periodSales
      .filter(sale => sale.sale_type === "product")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const serviceSales = periodSales
      .filter(sale => sale.sale_type === "service")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const comboSales = periodSales
      .filter(sale => sale.sale_type === "combo")
      .reduce((sum, sale) => sum + sale.total, 0)

    // Top products for the period
    const productSalesMap: { [key: string]: { quantity: number, revenue: number, name: string } } = {}
    
    periodSales.forEach(sale => {
      if (!productSalesMap[sale.product_id]) {
        productSalesMap[sale.product_id] = {
          quantity: 0,
          revenue: 0,
          name: sale.product_name
        }
      }
      productSalesMap[sale.product_id].quantity += sale.quantity
      productSalesMap[sale.product_id].revenue += sale.total
    })

    const topProducts = Object.entries(productSalesMap)
      .map(([_productId, data]) => ({
        product_name: data.name,
        quantity_sold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const avgTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    return {
      period,
      period_label: periodLabel,
      start_date: startDate,
      end_date: endDate,
      total_sales: totalSales,
      transaction_count: transactionCount,
      avg_ticket: avgTicket,
      cash_sales: cashSales,
      card_sales: cardSales,
      transfer_sales: transferSales,
      product_sales: productSales,
      service_sales: serviceSales,
      combo_sales: comboSales,
      top_products: topProducts
    }
  }

  private generateMockPeriodSales(period: 'week' | 'month' | 'year', startDate: string, endDate: string): Sale[] {
    const mockSales: Sale[] = []
    const products = this.products
    
    let saleCount: number
    switch (period) {
      case 'week':
        saleCount = Math.floor(Math.random() * 15) + 10 // 10-25 sales
        break
      case 'month':
        saleCount = Math.floor(Math.random() * 50) + 30 // 30-80 sales
        break
      case 'year':
        saleCount = Math.floor(Math.random() * 300) + 200 // 200-500 sales
        break
      default:
        saleCount = 10
    }

    const paymentMethods: Array<"cash" | "card" | "transfer"> = ["cash", "card", "transfer"]
    const saleTypes: Array<"product" | "service" | "combo"> = ["product", "service", "combo"]

    for (let i = 0; i < saleCount; i++) {
      const randomProduct = products[Math.floor(Math.random() * products.length)]
      const randomDate = this.getRandomDateBetween(startDate, endDate)
      const quantity = Math.floor(Math.random() * 3) + 1

      mockSales.push({
        id: `MOCK_${i}`,
        date: randomDate,
        product_id: randomProduct.id,
        product_name: randomProduct.name,
        quantity: quantity,
        unit_price: randomProduct.price,
        total: randomProduct.price * quantity,
        payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        sale_type: saleTypes[Math.floor(Math.random() * saleTypes.length)],
        employee: "Empleado Mock"
      })
    }

    return mockSales
  }

  private getRandomDateBetween(startDate: string, endDate: string): string {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const randomTime = start + Math.random() * (end - start)
    return new Date(randomTime).toISOString().split('T')[0]
  }

  async getCustomRangeMetrics(startDate: string, endDate: string) {
    const rangeSales = await this.getSales(startDate, endDate)
    
    // Calculate days between dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    const timeDiff = end.getTime() - start.getTime()
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

    const totalSales = rangeSales.reduce((sum, sale) => sum + sale.total, 0)
    const transactionCount = rangeSales.length
    
    const cashSales = rangeSales
      .filter(sale => sale.payment_method === "cash")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const cardSales = rangeSales
      .filter(sale => sale.payment_method === "card")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const transferSales = rangeSales
      .filter(sale => sale.payment_method === "transfer")
      .reduce((sum, sale) => sum + sale.total, 0)

    // Calculate sales by type
    const productSales = rangeSales
      .filter(sale => sale.sale_type === "product")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const serviceSales = rangeSales
      .filter(sale => sale.sale_type === "service")
      .reduce((sum, sale) => sum + sale.total, 0)
    
    const comboSales = rangeSales
      .filter(sale => sale.sale_type === "combo")
      .reduce((sum, sale) => sum + sale.total, 0)

    // Top products for the range
    const productSalesMap: { [key: string]: { quantity: number, revenue: number, name: string } } = {}
    
    rangeSales.forEach(sale => {
      if (!productSalesMap[sale.product_id]) {
        productSalesMap[sale.product_id] = {
          quantity: 0,
          revenue: 0,
          name: sale.product_name
        }
      }
      productSalesMap[sale.product_id].quantity += sale.quantity
      productSalesMap[sale.product_id].revenue += sale.total
    })

    const topProducts = Object.entries(productSalesMap)
      .map(([_productId, data]) => ({
        product_name: data.name,
        quantity_sold: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    const avgTicket = transactionCount > 0 ? totalSales / transactionCount : 0

    const periodLabel = `${start.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })} - ${end.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })} (${daysDiff} días)`

    return {
      period: 'custom',
      period_label: periodLabel,
      start_date: startDate,
      end_date: endDate,
      days_count: daysDiff,
      total_sales: totalSales,
      transaction_count: transactionCount,
      avg_ticket: avgTicket,
      daily_average: totalSales / daysDiff,
      cash_sales: cashSales,
      card_sales: cardSales,
      transfer_sales: transferSales,
      product_sales: productSales,
      service_sales: serviceSales,
      combo_sales: comboSales,
      top_products: topProducts
    }
  }

  async getLowStockProducts(): Promise<Product[]> {
    return this.products.filter(product => {
      // Logic: < 5 for products under $200, < 2 for products over $200
      const threshold = product.price < 200 ? 5 : 2
      return product.stock < threshold
    })
  }
}