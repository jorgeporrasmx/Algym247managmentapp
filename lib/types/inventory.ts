export interface Product {
  id: string
  name: string
  price: number
  stock: number
  stock_minimum: number
  category: string
  created_at?: string
}

export interface Sale {
  id: string
  date: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total: number
  payment_method: "cash" | "card" | "transfer"
  sale_type: "product" | "service" | "combo"
  employee: string
  created_at?: string
}

export interface StockMovement {
  id: string
  date: string
  product_id: string
  product_name: string
  type: "entrada" | "salida"
  quantity: number
  resulting_stock: number
  reason?: string
  created_at?: string
}

export interface DailyMetrics {
  date: string
  total_sales: number
  transaction_count: number
  cash_sales: number
  card_sales: number
  transfer_sales: number
  top_products: Array<{
    product_name: string
    quantity_sold: number
    revenue: number
  }>
}

export interface MonthlyMetrics {
  month: string
  year: number
  total_revenue: number
  product_revenue: number
  service_revenue: number
  combo_revenue: number
  transaction_count: number
  avg_ticket: number
}

export interface StockAlert {
  product_id: string
  product_name: string
  current_stock: number
  minimum_stock: number
  urgency: "high" | "medium" | "low"
  price: number
}