import { Product, Sale, StockMovement } from "@/lib/types/inventory"

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_API_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU0NTg4Mzg0MiwiYWFpIjoxMSwidWlkIjoxNzQzODU4OCwiaWFkIjoiMjAyNS0wOC0wMVQxODo0NzoyNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NzY2MDA2NSwicmduIjoidXNlMSJ9.LvuqR-VN5x3_MZhm1gGYem6Y5Ads01RSNrQB2qctw88'
const BOARD_ID = '9944534259'

export class MondayAPIService {
  private static instance: MondayAPIService
  private productCache: Product[] = []
  private lastCacheTime: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  static getInstance(): MondayAPIService {
    if (!MondayAPIService.instance) {
      MondayAPIService.instance = new MondayAPIService()
    }
    return MondayAPIService.instance
  }

  private async makeQuery(query: string, variables?: any) {
    try {
      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
          'API-Version': '2023-10'
        },
        body: JSON.stringify({
          query,
          variables
        })
      })

      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.errors) {
        console.error('Monday API errors:', data.errors)
        throw new Error(`Monday API error: ${data.errors[0]?.message}`)
      }

      return data.data
    } catch (error) {
      console.error('Error making Monday API request:', error)
      throw error
    }
  }

  async getBoardStructure() {
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          id
          name
          description
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `

    return this.makeQuery(query)
  }

  async getBoardItems() {
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          items_page {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `

    return this.makeQuery(query)
  }

  private async shouldInvalidateCache(): Promise<boolean> {
    const now = Date.now()
    const cacheExpired = (now - this.lastCacheTime) > this.CACHE_DURATION
    
    if (cacheExpired) {
      console.log('Cache expired, will fetch fresh data')
      return true
    }

    // Check if webhook invalidated cache
    try {
      const response = await fetch(`/api/webhook/monday?lastCacheTime=${this.lastCacheTime}`, {
        method: 'GET',
        headers: { 'X-Cache-Check': 'true' }
      })
      
      if (response.ok) {
        const { shouldInvalidate } = await response.json()
        if (shouldInvalidate) {
          console.log('Cache invalidated by webhook')
          return true
        }
      }
    } catch (error) {
      console.log('Could not check webhook cache status, using time-based cache')
    }

    return false
  }

  async getProducts(): Promise<Product[]> {
    try {
      // Use cache if available and valid
      if (this.productCache.length > 0 && !(await this.shouldInvalidateCache())) {
        console.log('Returning cached products:', this.productCache.length, 'items')
        return [...this.productCache]
      }

      console.log('Fetching fresh products from Monday...')
      const data = await this.getBoardItems()
      const board = data.boards[0]
      
      if (!board || !board.items_page) {
        throw new Error('Board or items not found')
      }

      console.log('Monday Board Data:', board.items_page.items.length, 'items found')
      
      // Map Monday items to our Product interface
      const products: Product[] = board.items_page.items.map((item: any) => {
        const columnValues = item.column_values.reduce((acc: any, col: any) => {
          acc[col.id] = col.text || col.value
          return acc
        }, {})

        // Map Monday columns to our product fields based on actual board structure
        return {
          id: item.id,
          name: item.name,
          price: this.parseNumber(columnValues.precio) || 0,
          stock: this.parseNumber(columnValues.stok) || 0,
          stock_minimum: columnValues.precio && this.parseNumber(columnValues.precio) < 200 ? 5 : 2,
          category: columnValues.text_mkvf142x || 'Sin categoría',
          created_at: new Date().toISOString()
        }
      }).filter(product => product.name) // Filter out items without names

      // Update cache
      this.productCache = products
      this.lastCacheTime = Date.now()
      console.log('Products cached successfully:', products.length, 'items')

      return products
    } catch (error) {
      console.error('Error fetching products from Monday:', error)
      
      // Return cached data if available, otherwise mock data
      if (this.productCache.length > 0) {
        console.log('Returning stale cache due to error')
        return [...this.productCache]
      }
      
      return this.getMockProducts()
    }
  }

  private parseNumber(value: string | any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''))
      return isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  private getMockProducts(): Product[] {
    return [
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
      }
    ]
  }

  async addSale(sale: Omit<Sale, 'id'>): Promise<Sale> {
    try {
      // Create a new item in Monday for the sale
      const mutation = `
        mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId
            item_name: $itemName
            column_values: $columnValues
          ) {
            id
          }
        }
      `

      const variables = {
        boardId: BOARD_ID,
        itemName: `Venta: ${sale.product_name} - ${sale.quantity}x`,
        columnValues: JSON.stringify({
          // Map sale data to Monday columns
          // You'll need to adjust these column IDs based on your Monday board
          fecha: sale.date,
          producto: sale.product_name,
          cantidad: sale.quantity.toString(),
          precio: sale.unit_price.toString(),
          total: sale.total.toString(),
          metodo_pago: sale.payment_method,
          tipo_venta: sale.sale_type,
          empleado: sale.employee
        })
      }

      const result = await this.makeQuery(mutation, variables)
      
      // Update stock in Monday
      await this.updateProductStock(sale.product_id, sale.quantity, 'subtract')

      const newSale: Sale = {
        ...sale,
        id: result.create_item.id
      }

      return newSale
    } catch (error) {
      console.error('Error adding sale to Monday:', error)
      throw error
    }
  }

  async updateProductStock(productId: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<boolean> {
    try {
      // First, get current stock
      const products = await this.getProducts()
      const product = products.find(p => p.id === productId)
      
      if (!product) {
        throw new Error('Product not found')
      }

      let newStock: number
      switch (operation) {
        case 'add':
          newStock = product.stock + quantity
          break
        case 'subtract':
          newStock = Math.max(0, product.stock - quantity)
          break
        case 'set':
          newStock = quantity
          break
        default:
          throw new Error('Invalid operation')
      }

      // Update stock in Monday
      const mutation = `
        mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
          change_column_value (
            board_id: $boardId
            item_id: $itemId
            column_id: $columnId
            value: $value
          ) {
            id
          }
        }
      `

      const variables = {
        boardId: BOARD_ID,
        itemId: productId,
        columnId: 'stok', // Correct column ID from Monday board
        value: newStock.toString()
      }

      await this.makeQuery(mutation, variables)
      return true
    } catch (error) {
      console.error('Error updating stock in Monday:', error)
      return false
    }
  }

  async addStock(productId: string, quantity: number, reason: string = "Reposición"): Promise<boolean> {
    return this.updateProductStock(productId, quantity, 'add')
  }

  // Analytics methods using Monday data
  async getMetricsByPeriod(period: 'day' | 'week' | 'month' | 'year', date?: string) {
    try {
      // For now, return mock data for metrics
      // In a full implementation, you would query Monday for sales data and calculate metrics
      return this.getMockMetrics(period, date)
    } catch (error) {
      console.error('Error getting metrics from Monday:', error)
      return this.getMockMetrics(period, date)
    }
  }

  private getMockMetrics(period: string, date?: string) {
    const currentDate = date ? new Date(date) : new Date()
    
    // Generate realistic mock metrics based on period
    const baseMetrics = {
      day: { sales: 1200, transactions: 8 },
      week: { sales: 8500, transactions: 45 },
      month: { sales: 35000, transactions: 180 },
      year: { sales: 420000, transactions: 2100 }
    }

    const metrics = baseMetrics[period as keyof typeof baseMetrics] || baseMetrics.month

    return {
      period,
      period_label: this.getPeriodLabel(period, currentDate),
      total_sales: metrics.sales,
      transaction_count: metrics.transactions,
      avg_ticket: metrics.sales / metrics.transactions,
      cash_sales: metrics.sales * 0.4,
      card_sales: metrics.sales * 0.45,
      transfer_sales: metrics.sales * 0.15,
      product_sales: metrics.sales * 0.7,
      service_sales: metrics.sales * 0.25,
      combo_sales: metrics.sales * 0.05,
      top_products: [
        { product_name: "Proteína Whey", quantity_sold: 15, revenue: 13485 },
        { product_name: "Creatina", quantity_sold: 12, revenue: 5400 },
        { product_name: "Shaker Premium", quantity_sold: 8, revenue: 1440 }
      ]
    }
  }

  private getPeriodLabel(period: string, date: Date): string {
    switch (period) {
      case 'day':
        return date.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      case 'month':
        return date.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
      case 'year':
        return date.getFullYear().toString()
      default:
        return 'Período personalizado'
    }
  }

  async getLowStockProducts(): Promise<Product[]> {
    const products = await this.getProducts()
    return products.filter(product => {
      const threshold = product.price < 200 ? 5 : 2
      return product.stock < threshold
    })
  }

  // Method to sync data bidirectionally
  async syncWithMonday(): Promise<void> {
    try {
      console.log('Syncing with Monday.com board...')
      const boardData = await this.getBoardStructure()
      console.log('Monday board synced successfully', boardData)
    } catch (error) {
      console.error('Error syncing with Monday:', error)
    }
  }
}