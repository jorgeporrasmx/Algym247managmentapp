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
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Payment {
  id?: string
  contract_id?: string
  member_id: string
  member_name?: string
  member_email?: string
  contract_type?: string
  amount: number
  payment_date: string | Date | Timestamp
  payment_method: 'credit_card' | 'debit_card' | 'cash' | 'transfer' | 'direct_debit'
  status: 'completed' | 'pending' | 'failed' | 'refunded'
  transaction_id?: string
  notes?: string
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

const COLLECTION_NAME = 'payments'

function getFirestore() {
  if (!db) {
    throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  }
  return db
}

export class PaymentsService {
  private static instance: PaymentsService

  static getInstance(): PaymentsService {
    if (!PaymentsService.instance) {
      PaymentsService.instance = new PaymentsService()
    }
    return PaymentsService.instance
  }

  async createPayment(paymentData: Omit<Payment, 'id'>): Promise<Payment> {
    const firestore = getFirestore()

    const docData = {
      ...paymentData,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData)

    return {
      ...paymentData,
      id: docRef.id,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  async getPayment(id: string): Promise<Payment | null> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return { id: docSnap.id, ...docSnap.data() } as Payment
  }

  async listPayments(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    memberId?: string
    paymentMethod?: string
  } = {}): Promise<{
    payments: Payment[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    const { pageSize = 50, lastDoc: lastDocument, status, memberId, paymentMethod } = options

    let q = query(
      collection(getFirestore(), COLLECTION_NAME),
      orderBy('created_at', 'desc'),
      limit(pageSize + 1)
    )

    if (status) {
      q = query(q, where('status', '==', status))
    }

    if (memberId) {
      q = query(q, where('member_id', '==', memberId))
    }

    if (paymentMethod) {
      q = query(q, where('payment_method', '==', paymentMethod))
    }

    if (lastDocument) {
      q = query(q, startAfter(lastDocument))
    }

    const querySnapshot = await getDocs(q)
    const docs = querySnapshot.docs
    const hasMore = docs.length > pageSize

    if (hasMore) {
      docs.pop()
    }

    const payments: Payment[] = docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Payment))

    return {
      payments,
      lastDoc: hasMore ? docs[docs.length - 1] : undefined,
      hasMore
    }
  }

  async getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const q = query(
      collection(getFirestore(), COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('created_at', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Payment))
  }

  async getPaymentsByContract(contractId: string): Promise<Payment[]> {
    const q = query(
      collection(getFirestore(), COLLECTION_NAME),
      where('contract_id', '==', contractId),
      orderBy('created_at', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Payment))
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    })
  }

  async getStats(): Promise<{
    total: number
    completed: number
    pending: number
    failed: number
    totalRevenue: number
  }> {
    const stats = { total: 0, completed: 0, pending: 0, failed: 0, totalRevenue: 0 }

    const querySnapshot = await getDocs(collection(getFirestore(), COLLECTION_NAME))

    querySnapshot.docs.forEach(d => {
      const payment = d.data() as Payment
      stats.total++

      switch (payment.status) {
        case 'completed':
          stats.completed++
          stats.totalRevenue += payment.amount || 0
          break
        case 'pending': stats.pending++; break
        case 'failed': stats.failed++; break
      }
    })

    return stats
  }
}

export default PaymentsService.getInstance()
