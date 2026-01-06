import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './config'

export interface SaleItem {
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  total_price: number
}

export interface Sale {
  id?: string

  // Sale Information
  sale_id: string  // Internal ID (SALE0001, SALE0002, etc.)
  transaction_id: string

  // Items
  items: SaleItem[]
  total_amount: number

  // Customer Info
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  member_id?: string

  // Payment
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'mixed'
  payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partial'
  payment_details?: string

  // Sale type
  sale_type?: 'product' | 'service' | 'membership' | 'combo'

  // Employee who made the sale
  employee_id?: string
  employee_name?: string

  // Notes
  notes?: string

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface SaleWithDetails extends Sale {
  member?: {
    id: string
    name: string
    email: string
  }
  employee?: {
    id: string
    name: string
  }
}

const COLLECTION_NAME = 'sales'

export class SalesService {
  private static instance: SalesService

  static getInstance(): SalesService {
    if (!SalesService.instance) {
      SalesService.instance = new SalesService()
    }
    return SalesService.instance
  }

  // Generate next sale ID
  private async generateSaleId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().sale_id)
      .filter(id => id && id.startsWith('SALE'))
      .map(id => parseInt(id.replace('SALE', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `SALE${String(maxId + 1).padStart(5, '0')}`
  }

  // Generate transaction ID
  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Convert Firestore document to Sale
  private docToSale(doc: any): Sale {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at
    }
  }

  // Create a new sale
  async createSale(saleData: Omit<Sale, 'id' | 'sale_id' | 'transaction_id' | 'created_at' | 'updated_at'>): Promise<Sale> {
    const sale_id = await this.generateSaleId()
    const transaction_id = this.generateTransactionId()

    // Calculate total if not provided
    const total_amount = saleData.total_amount || saleData.items.reduce(
      (sum, item) => sum + item.total_price, 0
    )

    const docData = {
      ...saleData,
      sale_id,
      transaction_id,
      total_amount,
      payment_status: saleData.payment_status || 'completed',
      sale_type: saleData.sale_type || 'product',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...saleData,
      sale_id,
      transaction_id,
      total_amount,
      payment_status: saleData.payment_status || 'completed',
      sale_type: saleData.sale_type || 'product',
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single sale by ID
  async getSale(id: string): Promise<Sale | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToSale(docSnap)
  }

  // Get sale by sale_id (SALE00001, etc.)
  async getSaleBySaleId(saleId: string): Promise<Sale | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sale_id', '==', saleId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToSale(snapshot.docs[0])
  }

  // Get sale by transaction ID
  async getSaleByTransactionId(transactionId: string): Promise<Sale | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('transaction_id', '==', transactionId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToSale(snapshot.docs[0])
  }

  // Get sales by member
  async getSalesByMember(memberId: string): Promise<Sale[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('created_at', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToSale(doc))
  }

  // Get sales by employee
  async getSalesByEmployee(employeeId: string): Promise<Sale[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('employee_id', '==', employeeId),
      orderBy('created_at', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToSale(doc))
  }

  // Get all sales with pagination and filters
  async getSales(options: {
    page?: number
    limit?: number
    paymentMethod?: string
    paymentStatus?: string
    saleType?: string
    memberId?: string
    employeeId?: string
    startDate?: Date
    endDate?: Date
  } = {}): Promise<{ sales: Sale[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      paymentMethod,
      paymentStatus,
      saleType,
      memberId,
      employeeId,
      startDate,
      endDate
    } = options

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('created_at', 'desc')
    )

    const snapshot = await getDocs(q)
    let sales = snapshot.docs.map(doc => this.docToSale(doc))

    // Apply filters in memory
    if (paymentMethod) {
      sales = sales.filter(s => s.payment_method === paymentMethod)
    }

    if (paymentStatus) {
      sales = sales.filter(s => s.payment_status === paymentStatus)
    }

    if (saleType) {
      sales = sales.filter(s => s.sale_type === saleType)
    }

    if (memberId) {
      sales = sales.filter(s => s.member_id === memberId)
    }

    if (employeeId) {
      sales = sales.filter(s => s.employee_id === employeeId)
    }

    if (startDate) {
      sales = sales.filter(s => {
        const saleDate = s.created_at instanceof Date
          ? s.created_at
          : new Date(s.created_at as string)
        return saleDate >= startDate
      })
    }

    if (endDate) {
      sales = sales.filter(s => {
        const saleDate = s.created_at instanceof Date
          ? s.created_at
          : new Date(s.created_at as string)
        return saleDate <= endDate
      })
    }

    const total = sales.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    sales = sales.slice(startIndex, startIndex + limitCount)

    return { sales, total }
  }

  // Get today's sales
  async getTodaySales(): Promise<Sale[]> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const { sales } = await this.getSales({
      startDate: today,
      endDate: tomorrow,
      limit: 1000
    })

    return sales
  }

  // Update a sale
  async updateSale(id: string, updates: Partial<Sale>): Promise<Sale | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    // Recalculate total if items changed
    let total_amount = updates.total_amount
    if (updates.items) {
      total_amount = updates.items.reduce((sum, item) => sum + item.total_price, 0)
    }

    const updateData: any = {
      ...updates,
      updated_at: serverTimestamp()
    }

    if (total_amount !== undefined) {
      updateData.total_amount = total_amount
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getSale(id)
  }

  // Process refund
  async processRefund(id: string, reason?: string): Promise<Sale | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    await updateDoc(docRef, {
      payment_status: 'refunded',
      refund_reason: reason,
      refunded_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })

    return this.getSale(id)
  }

  // Get sales statistics
  async getStats(period?: { start: Date; end: Date }): Promise<{
    totalSales: number
    totalRevenue: number
    completedSales: number
    pendingSales: number
    refundedSales: number
    averageTicket: number
    salesByPaymentMethod: Record<string, { count: number; amount: number }>
    salesByType: Record<string, { count: number; amount: number }>
  }> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    let sales = snapshot.docs.map(doc => this.docToSale(doc))

    // Filter by period if provided
    if (period) {
      sales = sales.filter(s => {
        const saleDate = s.created_at instanceof Date
          ? s.created_at
          : new Date(s.created_at as string)
        return saleDate >= period.start && saleDate <= period.end
      })
    }

    const completedSales = sales.filter(s => s.payment_status === 'completed')
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.total_amount, 0)

    // Group by payment method
    const salesByPaymentMethod: Record<string, { count: number; amount: number }> = {}
    completedSales.forEach(s => {
      const method = s.payment_method || 'unknown'
      if (!salesByPaymentMethod[method]) {
        salesByPaymentMethod[method] = { count: 0, amount: 0 }
      }
      salesByPaymentMethod[method].count++
      salesByPaymentMethod[method].amount += s.total_amount
    })

    // Group by sale type
    const salesByType: Record<string, { count: number; amount: number }> = {}
    completedSales.forEach(s => {
      const type = s.sale_type || 'product'
      if (!salesByType[type]) {
        salesByType[type] = { count: 0, amount: 0 }
      }
      salesByType[type].count++
      salesByType[type].amount += s.total_amount
    })

    return {
      totalSales: sales.length,
      totalRevenue,
      completedSales: completedSales.length,
      pendingSales: sales.filter(s => s.payment_status === 'pending').length,
      refundedSales: sales.filter(s => s.payment_status === 'refunded').length,
      averageTicket: completedSales.length > 0 ? totalRevenue / completedSales.length : 0,
      salesByPaymentMethod,
      salesByType
    }
  }

  // Get daily summary
  async getDailySummary(date?: Date): Promise<{
    date: string
    totalSales: number
    totalRevenue: number
    transactions: number
    topProducts: { name: string; quantity: number; revenue: number }[]
  }> {
    const targetDate = date || new Date()
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    const { sales } = await this.getSales({
      startDate: startOfDay,
      endDate: endOfDay,
      limit: 1000
    })

    const completedSales = sales.filter(s => s.payment_status === 'completed')

    // Aggregate products
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()
    completedSales.forEach(sale => {
      sale.items.forEach(item => {
        const existing = productMap.get(item.product_id) || {
          name: item.product_name,
          quantity: 0,
          revenue: 0
        }
        existing.quantity += item.quantity
        existing.revenue += item.total_price
        productMap.set(item.product_id, existing)
      })
    })

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return {
      date: targetDate.toISOString().split('T')[0],
      totalSales: completedSales.length,
      totalRevenue: completedSales.reduce((sum, s) => sum + s.total_amount, 0),
      transactions: completedSales.length,
      topProducts
    }
  }
}
