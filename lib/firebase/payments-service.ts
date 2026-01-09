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
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Payment {
  id?: string
  monday_item_id?: string

  // Payment Details
  member_id: string
  contract_id?: string
  amount: number
  currency: string
  payment_type: 'membership' | 'renewal' | 'late_fee' | 'penalty' | 'product' | 'service' | 'other'
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled'

  // Dates
  due_date: Date | Timestamp
  paid_date?: Date | Timestamp

  // Payment Method
  payment_method: 'credit_card' | 'debit_card' | 'bank_transfer' | 'cash' | 'check' | 'online'

  // References
  payment_reference?: string
  fiserv_payment_id?: string
  external_reference?: string

  // Additional Info
  description?: string
  notes?: string
  metadata?: Record<string, unknown>

  // Sync Metadata
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
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

  // Create a new payment
  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    try {
      const docData = {
        ...paymentData,
        currency: paymentData.currency || 'MXN',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

      return {
        ...paymentData,
        id: docRef.id,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      throw error
    }
  }

  // Get a single payment by ID
  async getPayment(id: string): Promise<Payment | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Payment
    } catch (error) {
      console.error('Error getting payment:', error)
      throw error
    }
  }

  // List payments with pagination and filters
  async listPayments(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    member_id?: string
    payment_type?: string
    payment_method?: string
    startDate?: Date
    endDate?: Date
  } = {}): Promise<{
    payments: Payment[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    try {
      const { pageSize = 50, lastDoc, status, member_id, payment_type, payment_method, startDate, endDate } = options

      let q = query(
        collection(db, COLLECTION_NAME),
        orderBy('created_at', 'desc'),
        limit(pageSize + 1)
      )

      if (status) {
        q = query(q, where('status', '==', status))
      }

      if (member_id) {
        q = query(q, where('member_id', '==', member_id))
      }

      if (payment_type) {
        q = query(q, where('payment_type', '==', payment_type))
      }

      if (payment_method) {
        q = query(q, where('payment_method', '==', payment_method))
      }

      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }

      const querySnapshot = await getDocs(q)
      let docs = querySnapshot.docs
      const hasMore = docs.length > pageSize

      if (hasMore) {
        docs.pop()
      }

      let payments: Payment[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment))

      // Client-side date filtering
      if (startDate || endDate) {
        payments = payments.filter(payment => {
          const paymentDate = payment.created_at instanceof Timestamp
            ? payment.created_at.toDate()
            : new Date(payment.created_at as Date)

          if (startDate && paymentDate < startDate) return false
          if (endDate && paymentDate > endDate) return false
          return true
        })
      }

      return {
        payments,
        lastDoc: hasMore ? docs[docs.length - 1] : undefined,
        hasMore
      }
    } catch (error) {
      console.error('Error listing payments:', error)
      throw error
    }
  }

  // Get payments by member
  async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('member_id', '==', memberId),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment))
    } catch (error) {
      console.error('Error getting payments by member:', error)
      throw error
    }
  }

  // Get payments by contract
  async getPaymentsByContract(contractId: string): Promise<Payment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('contract_id', '==', contractId),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment))
    } catch (error) {
      console.error('Error getting payments by contract:', error)
      throw error
    }
  }

  // Update a payment
  async updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)

      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error updating payment:', error)
      throw error
    }
  }

  // Mark payment as paid
  async markAsPaid(id: string, fiservPaymentId?: string, externalReference?: string): Promise<void> {
    try {
      const updates: Partial<Payment> = {
        status: 'paid',
        paid_date: new Date(),
        sync_status: 'pending'
      }

      if (fiservPaymentId) {
        updates.fiserv_payment_id = fiservPaymentId
      }

      if (externalReference) {
        updates.external_reference = externalReference
      }

      await this.updatePayment(id, updates)
    } catch (error) {
      console.error('Error marking payment as paid:', error)
      throw error
    }
  }

  // Mark payment as failed
  async markAsFailed(id: string, reason?: string): Promise<void> {
    try {
      await this.updatePayment(id, {
        status: 'failed',
        notes: reason,
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error marking payment as failed:', error)
      throw error
    }
  }

  // Refund payment
  async refundPayment(id: string, reason?: string): Promise<void> {
    try {
      await this.updatePayment(id, {
        status: 'refunded',
        notes: reason,
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error refunding payment:', error)
      throw error
    }
  }

  // Cancel payment
  async cancelPayment(id: string): Promise<void> {
    try {
      await this.updatePayment(id, {
        status: 'cancelled',
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error cancelling payment:', error)
      throw error
    }
  }

  // Hard delete a payment (permanent)
  async hardDeletePayment(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error hard deleting payment:', error)
      throw error
    }
  }

  // Search by payment reference
  async searchByReference(reference: string): Promise<Payment | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('payment_reference', '==', reference),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      } as Payment
    } catch (error) {
      console.error('Error searching by reference:', error)
      throw error
    }
  }

  // Search by Monday item ID
  async searchByMondayId(mondayItemId: string): Promise<Payment | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('monday_item_id', '==', mondayItemId),
        limit(1)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      } as Payment
    } catch (error) {
      console.error('Error searching by Monday ID:', error)
      throw error
    }
  }

  // Get overdue payments
  async getOverduePayments(): Promise<Payment[]> {
    try {
      const now = new Date()

      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'pending'),
        where('due_date', '<', Timestamp.fromDate(now)),
        orderBy('due_date', 'asc')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment))
    } catch (error) {
      console.error('Error getting overdue payments:', error)
      throw error
    }
  }

  // Get payments needing sync
  async getPaymentsNeedingSync(): Promise<Payment[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sync_status', '==', 'pending')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Payment))
    } catch (error) {
      console.error('Error getting payments needing sync:', error)
      throw error
    }
  }

  // Update sync status
  async updateSyncStatus(
    id: string,
    status: 'synced' | 'pending' | 'error',
    error?: string,
    mondayItemId?: string
  ): Promise<void> {
    try {
      const updates: Record<string, unknown> = {
        sync_status: status,
        last_synced_at: serverTimestamp()
      }

      if (error) {
        updates.sync_error = error
      }

      if (mondayItemId) {
        updates.monday_item_id = mondayItemId
      }

      const docRef = doc(db, COLLECTION_NAME, id)
      await updateDoc(docRef, updates)
    } catch (error) {
      console.error('Error updating sync status:', error)
      throw error
    }
  }

  // Get statistics
  async getStats(): Promise<{
    total: number
    pending: number
    paid: number
    failed: number
    refunded: number
    cancelled: number
    totalAmount: number
    paidAmount: number
    pendingAmount: number
    needingSync: number
  }> {
    try {
      const stats = {
        total: 0,
        pending: 0,
        paid: 0,
        failed: 0,
        refunded: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        needingSync: 0
      }

      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME))

      querySnapshot.docs.forEach(doc => {
        const payment = doc.data() as Payment
        stats.total++
        stats.totalAmount += payment.amount || 0

        switch (payment.status) {
          case 'pending':
            stats.pending++
            stats.pendingAmount += payment.amount || 0
            break
          case 'paid':
            stats.paid++
            stats.paidAmount += payment.amount || 0
            break
          case 'failed':
            stats.failed++
            break
          case 'refunded':
            stats.refunded++
            break
          case 'cancelled':
            stats.cancelled++
            break
        }

        if (payment.sync_status === 'pending') {
          stats.needingSync++
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting stats:', error)
      throw error
    }
  }
}

export default PaymentsService.getInstance()
