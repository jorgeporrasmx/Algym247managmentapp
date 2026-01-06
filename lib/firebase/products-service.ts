import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Product {
  id?: string

  // Product Information
  product_id: string  // Internal ID (PROD001, PROD002, etc.)
  name: string
  brand?: string
  type?: string
  category: string
  description?: string

  // Supplier Info
  supplier?: string
  supplier_email?: string
  supplier_website?: string

  // Pricing
  price: number
  cost?: number
  margin?: number

  // Inventory
  stock: number
  stock_minimum: number
  location?: string  // gym/warehouse location

  // Status
  status: 'active' | 'inactive' | 'out_of_stock' | 'discontinued'

  // Monday.com sync
  monday_item_id?: string
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface ProductWithStats extends Product {
  total_sold?: number
  revenue?: number
  last_sale_date?: Date | Timestamp | string
}

const COLLECTION_NAME = 'products'

export class ProductsService {
  private static instance: ProductsService

  static getInstance(): ProductsService {
    if (!ProductsService.instance) {
      ProductsService.instance = new ProductsService()
    }
    return ProductsService.instance
  }

  // Generate next product ID
  private async generateProductId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().product_id)
      .filter(id => id && id.startsWith('PROD'))
      .map(id => parseInt(id.replace('PROD', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `PROD${String(maxId + 1).padStart(4, '0')}`
  }

  // Convert Firestore document to Product
  private docToProduct(doc: any): Product {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at,
      last_synced_at: data.last_synced_at?.toDate?.() || data.last_synced_at
    }
  }

  // Create a new product
  async createProduct(productData: Omit<Product, 'id' | 'product_id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const product_id = await this.generateProductId()

    // Calculate margin if cost is provided
    const margin = productData.cost && productData.cost > 0
      ? ((productData.price - productData.cost) / productData.price) * 100
      : undefined

    const docData = {
      ...productData,
      product_id,
      margin,
      status: productData.status || (productData.stock > 0 ? 'active' : 'out_of_stock'),
      sync_status: 'pending' as const,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...productData,
      product_id,
      margin,
      status: productData.status || (productData.stock > 0 ? 'active' : 'out_of_stock'),
      sync_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single product by ID
  async getProduct(id: string): Promise<Product | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToProduct(docSnap)
  }

  // Get product by product_id (PROD0001, etc.)
  async getProductByProductId(productId: string): Promise<Product | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('product_id', '==', productId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToProduct(snapshot.docs[0])
  }

  // Get all products with pagination and filters
  async getProducts(options: {
    page?: number
    limit?: number
    search?: string
    category?: string
    status?: string
    lowStock?: boolean
  } = {}): Promise<{ products: Product[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      search,
      category,
      status,
      lowStock
    } = options

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('name', 'asc')
    )

    const snapshot = await getDocs(q)
    let products = snapshot.docs.map(doc => this.docToProduct(doc))

    // Apply filters in memory
    if (search) {
      const searchLower = search.toLowerCase()
      products = products.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.product_id.toLowerCase().includes(searchLower) ||
        p.category?.toLowerCase().includes(searchLower) ||
        p.brand?.toLowerCase().includes(searchLower)
      )
    }

    if (category) {
      products = products.filter(p =>
        p.category.toLowerCase() === category.toLowerCase()
      )
    }

    if (status) {
      products = products.filter(p => p.status === status)
    }

    if (lowStock) {
      products = products.filter(p => p.stock <= p.stock_minimum)
    }

    const total = products.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    products = products.slice(startIndex, startIndex + limitCount)

    return { products, total }
  }

  // Get low stock products
  async getLowStockProducts(): Promise<Product[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const products = snapshot.docs.map(doc => this.docToProduct(doc))

    return products.filter(p =>
      p.stock <= p.stock_minimum && p.status !== 'discontinued'
    )
  }

  // Get products by category
  async getProductsByCategory(category: string): Promise<Product[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('category', '==', category),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToProduct(doc))
  }

  // Get all categories
  async getCategories(): Promise<string[]> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const products = snapshot.docs.map(doc => this.docToProduct(doc))

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]
    return categories.sort()
  }

  // Update a product
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const currentData = docSnap.data()

    // Recalculate margin if price or cost changed
    let margin = currentData.margin
    const newPrice = updates.price ?? currentData.price
    const newCost = updates.cost ?? currentData.cost
    if (newCost && newCost > 0) {
      margin = ((newPrice - newCost) / newPrice) * 100
    }

    // Update status based on stock
    let status = updates.status ?? currentData.status
    const newStock = updates.stock ?? currentData.stock
    if (newStock <= 0 && status === 'active') {
      status = 'out_of_stock'
    } else if (newStock > 0 && status === 'out_of_stock') {
      status = 'active'
    }

    const updateData: any = {
      ...updates,
      margin,
      status,
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getProduct(id)
  }

  // Update stock
  async updateStock(id: string, quantity: number, operation: 'add' | 'subtract' | 'set'): Promise<Product | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const currentData = docSnap.data()
    let newStock: number

    switch (operation) {
      case 'add':
        newStock = (currentData.stock || 0) + quantity
        break
      case 'subtract':
        newStock = Math.max(0, (currentData.stock || 0) - quantity)
        break
      case 'set':
        newStock = quantity
        break
      default:
        throw new Error('Invalid operation')
    }

    // Update status based on new stock
    let status = currentData.status
    if (newStock <= 0 && status === 'active') {
      status = 'out_of_stock'
    } else if (newStock > 0 && status === 'out_of_stock') {
      status = 'active'
    }

    await updateDoc(docRef, {
      stock: newStock,
      status,
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    })

    return this.getProduct(id)
  }

  // Delete a product (soft delete by setting status to discontinued)
  async deleteProduct(id: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await updateDoc(docRef, {
      status: 'discontinued',
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    })

    return true
  }

  // Hard delete a product
  async hardDeleteProduct(id: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await deleteDoc(docRef)
    return true
  }

  // Update sync status after Monday.com sync
  async updateSyncStatus(id: string, status: 'synced' | 'error', error?: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)

    await updateDoc(docRef, {
      sync_status: status,
      sync_error: error || null,
      last_synced_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  }

  // Get products needing sync
  async getProductsNeedingSync(): Promise<Product[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sync_status', '==', 'pending'),
      limit(100)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToProduct(doc))
  }

  // Get product statistics
  async getStats(): Promise<{
    total: number
    active: number
    outOfStock: number
    lowStock: number
    discontinued: number
    totalValue: number
    categories: number
  }> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const products = snapshot.docs.map(doc => this.docToProduct(doc))

    const categories = [...new Set(products.map(p => p.category).filter(Boolean))]

    return {
      total: products.length,
      active: products.filter(p => p.status === 'active').length,
      outOfStock: products.filter(p => p.status === 'out_of_stock').length,
      lowStock: products.filter(p => p.stock <= p.stock_minimum && p.status !== 'discontinued').length,
      discontinued: products.filter(p => p.status === 'discontinued').length,
      totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
      categories: categories.length
    }
  }
}
