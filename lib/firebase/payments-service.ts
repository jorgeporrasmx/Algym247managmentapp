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
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Payment {
  id?: string
  monday_item_id?: string

  // Payment Information
  payment_id: string  // Internal ID (PAY001, PAY002, etc.)
  contract_id: string
  member_id: string

  // Financial
  amount: number
  payment_date: Date | Timestamp | string
  due_date?: Date | Timestamp | string
  payment_method: 'cash' | 'credit_card' | 'debit_card' | 'transfer' | 'online'

  // Status
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled'

  // Transaction details
  transaction_id?: string
  fiserv_reference?: string
  payment_link?: string
  notes?: string

  // Sync Metadata (Monday.com)
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface PaymentWithDetails extends Payment {
  member?: {
    id: string
    name: string
    email: string
  }
  contract?: {
    id: string
    contract_type: string
    monthly_fee: number
  }
}

const COLLECTION_NAME = 'payments'

export class PaymentsService {
  private static instance: PaymentsService

  static getInstance(): PaymentsService {
    if (!PaymentsService.instance) {
      PaymentsService.instance = new PaymentsService()
    }
    return PaymentsService.instance
  }

  // Generate next payment ID
  private async generatePaymentId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().payment_id)
      .filter(id => id && id.startsWith('PAY'))
      .map(id => parseInt(id.replace('PAY', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `PAY${String(maxId + 1).padStart(4, '0')}`
  }

  // Convert Firestore document to Payment
  private docToPayment(doc: any): Payment {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      payment_date: data.payment_date?.toDate?.() || data.payment_date,
      due_date: data.due_date?.toDate?.() || data.due_date,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at,
      last_synced_at: data.last_synced_at?.toDate?.() || data.last_synced_at
    }
  }

  // Create a new payment
  async createPayment(paymentData: Omit<Payment, 'id' | 'payment_id' | 'created_at' | 'updated_at'>): Promise<Payment> {
    const payment_id = await this.generatePaymentId()

    const docData = {
      ...paymentData,
      payment_id,
      payment_date: paymentData.payment_date instanceof Date
        ? Timestamp.fromDate(paymentData.payment_date)
        : paymentData.payment_date,
      due_date: paymentData.due_date instanceof Date
        ? Timestamp.fromDate(paymentData.due_date)
        : paymentData.due_date,
      sync_status: 'pending' as const,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...paymentData,
      payment_id,
      sync_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single payment by ID
  async getPayment(id: string): Promise<Payment | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToPayment(docSnap)
  }

  // Get payment by payment_id (PAY0001, etc.)
  async getPaymentByPaymentId(paymentId: string): Promise<Payment | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('payment_id', '==', paymentId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToPayment(snapshot.docs[0])
  }

  // Get payment by transaction ID or Fiserv reference
  async getPaymentByReference(reference: string): Promise<Payment | null> {
    // Try transaction_id first
    let q = query(
      collection(db, COLLECTION_NAME),
      where('transaction_id', '==', reference),
      limit(1)
    )

    let snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return this.docToPayment(snapshot.docs[0])
    }

    // Try fiserv_reference
    q = query(
      collection(db, COLLECTION_NAME),
      where('fiserv_reference', '==', reference),
      limit(1)
    )

    snapshot = await getDocs(q)

    if (!snapshot.empty) {
      return this.docToPayment(snapshot.docs[0])
    }

    return null
  }

  // Get payments for a member
  async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('payment_date', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToPayment(doc))
  }

  // Get payments for a contract
  async getPaymentsByContract(contractId: string): Promise<Payment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('contract_id', '==', contractId),
      orderBy('payment_date', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToPayment(doc))
  }

  // Get all payments with pagination and filters
  async getPayments(options: {
    page?: number
    limit?: number
    status?: string
    memberId?: string
    contractId?: string
    paymentMethod?: string
  } = {}): Promise<{ payments: Payment[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      status,
      memberId,
      contractId,
      paymentMethod
    } = options

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('payment_date', 'desc')
    )

    const snapshot = await getDocs(q)
    let payments = snapshot.docs.map(doc => this.docToPayment(doc))

    // Apply filters in memory
    if (status) {
      payments = payments.filter(p => p.status === status)
    }
    if (memberId) {
      payments = payments.filter(p => p.member_id === memberId)
    }
    if (contractId) {
      payments = payments.filter(p => p.contract_id === contractId)
    }
    if (paymentMethod) {
      payments = payments.filter(p => p.payment_method === paymentMethod)
    }

    const total = payments.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    payments = payments.slice(startIndex, startIndex + limitCount)

    return { payments, total }
  }

  // Update a payment
  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const updateData: any = {
      ...updates,
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    }

    // Convert dates to Timestamps
    if (updates.payment_date instanceof Date) {
      updateData.payment_date = Timestamp.fromDate(updates.payment_date)
    }
    if (updates.due_date instanceof Date) {
      updateData.due_date = Timestamp.fromDate(updates.due_date)
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getPayment(id)
  }

  // Update payment status (commonly used for webhooks)
  async updatePaymentStatus(
    id: string,
    status: Payment['status'],
    transactionId?: string,
    notes?: string
  ): Promise<Payment | null> {
    return this.updatePayment(id, {
      status,
      transaction_id: transactionId,
      notes
    })
  }

  // Get overdue payments
  async getOverduePayments(): Promise<Payment[]> {
    const now = new Date()

    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pending'),
      where('due_date', '<', Timestamp.fromDate(now)),
      orderBy('due_date', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToPayment(doc))
  }

  // Get pending payments
  async getPendingPayments(): Promise<Payment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pending'),
      orderBy('due_date', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToPayment(doc))
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

  // Get payments needing sync
  async getPaymentsNeedingSync(): Promise<Payment[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sync_status', '==', 'pending'),
      limit(100)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToPayment(doc))
  }

  // Get payment statistics
  async getStats(period?: { start: Date; end: Date }): Promise<{
    total: number
    completed: number
    pending: number
    failed: number
    totalAmount: number
    completedAmount: number
  }> {
    let q = query(collection(db, COLLECTION_NAME))

    const snapshot = await getDocs(q)
    let payments = snapshot.docs.map(doc => this.docToPayment(doc))

    // Filter by period if provided
    if (period) {
      payments = payments.filter(p => {
        const paymentDate = p.payment_date instanceof Date
          ? p.payment_date
          : new Date(p.payment_date as string)
        return paymentDate >= period.start && paymentDate <= period.end
      })
    }

    const completed = payments.filter(p => p.status === 'completed')

    return {
      total: payments.length,
      completed: completed.length,
      pending: payments.filter(p => p.status === 'pending').length,
      failed: payments.filter(p => p.status === 'failed').length,
      totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      completedAmount: completed.reduce((sum, p) => sum + (p.amount || 0), 0)
    }
  }
}
