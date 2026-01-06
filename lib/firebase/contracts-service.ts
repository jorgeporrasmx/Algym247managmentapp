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

export interface Contract {
  id?: string
  monday_item_id?: string

  // Contract Information
  contract_id: string  // Internal ID (CON001, CON002, etc.)
  member_id: string
  contract_type: 'monthly' | 'quarterly' | 'biannual' | 'annual' | 'day_pass'

  // Dates
  start_date: Date | Timestamp | string
  end_date: Date | Timestamp | string

  // Financial
  monthly_fee: number
  total_amount?: number
  payment_day?: number  // Day of month for recurring payments (1-28)

  // Status
  status: 'active' | 'expired' | 'cancelled' | 'pending' | 'suspended'

  // Sync Metadata (Monday.com)
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface ContractWithMember extends Contract {
  member?: {
    id: string
    name: string
    email: string
    status: string
  }
}

const COLLECTION_NAME = 'contracts'

export class ContractsService {
  private static instance: ContractsService

  static getInstance(): ContractsService {
    if (!ContractsService.instance) {
      ContractsService.instance = new ContractsService()
    }
    return ContractsService.instance
  }

  // Generate next contract ID
  private async generateContractId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().contract_id)
      .filter(id => id && id.startsWith('CON'))
      .map(id => parseInt(id.replace('CON', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `CON${String(maxId + 1).padStart(3, '0')}`
  }

  // Convert Firestore document to Contract
  private docToContract(doc: any): Contract {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      start_date: data.start_date?.toDate?.() || data.start_date,
      end_date: data.end_date?.toDate?.() || data.end_date,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at,
      last_synced_at: data.last_synced_at?.toDate?.() || data.last_synced_at
    }
  }

  // Create a new contract
  async createContract(contractData: Omit<Contract, 'id' | 'contract_id' | 'created_at' | 'updated_at'>): Promise<Contract> {
    const contract_id = await this.generateContractId()

    const docData = {
      ...contractData,
      contract_id,
      start_date: contractData.start_date instanceof Date
        ? Timestamp.fromDate(contractData.start_date)
        : contractData.start_date,
      end_date: contractData.end_date instanceof Date
        ? Timestamp.fromDate(contractData.end_date)
        : contractData.end_date,
      sync_status: 'pending' as const,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...contractData,
      contract_id,
      sync_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single contract by ID
  async getContract(id: string): Promise<Contract | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToContract(docSnap)
  }

  // Get contract by contract_id (CON001, etc.)
  async getContractByContractId(contractId: string): Promise<Contract | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('contract_id', '==', contractId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToContract(snapshot.docs[0])
  }

  // Get contracts for a member
  async getContractsByMember(memberId: string): Promise<Contract[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('created_at', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToContract(doc))
  }

  // Get all contracts with pagination and filters
  async getContracts(options: {
    page?: number
    limit?: number
    status?: string
    memberId?: string
    contractType?: string
  } = {}): Promise<{ contracts: Contract[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      status,
      memberId,
      contractType
    } = options

    let q = query(
      collection(db, COLLECTION_NAME),
      orderBy('created_at', 'desc')
    )

    // Note: Firestore requires composite indexes for multiple where clauses
    // For now, we'll filter in memory for complex queries
    const snapshot = await getDocs(q)

    let contracts = snapshot.docs.map(doc => this.docToContract(doc))

    // Apply filters in memory
    if (status) {
      contracts = contracts.filter(c => c.status === status)
    }
    if (memberId) {
      contracts = contracts.filter(c => c.member_id === memberId)
    }
    if (contractType) {
      contracts = contracts.filter(c =>
        c.contract_type.toLowerCase().includes(contractType.toLowerCase())
      )
    }

    const total = contracts.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    contracts = contracts.slice(startIndex, startIndex + limitCount)

    return { contracts, total }
  }

  // Update a contract
  async updateContract(id: string, updates: Partial<Contract>): Promise<Contract | null> {
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
    if (updates.start_date instanceof Date) {
      updateData.start_date = Timestamp.fromDate(updates.start_date)
    }
    if (updates.end_date instanceof Date) {
      updateData.end_date = Timestamp.fromDate(updates.end_date)
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getContract(id)
  }

  // Cancel a contract (soft delete)
  async cancelContract(id: string, reason?: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await updateDoc(docRef, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    })

    return true
  }

  // Get expiring contracts
  async getExpiringContracts(daysAhead: number = 30): Promise<Contract[]> {
    const now = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'active'),
      where('end_date', '>=', Timestamp.fromDate(now)),
      where('end_date', '<=', Timestamp.fromDate(futureDate)),
      orderBy('end_date', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToContract(doc))
  }

  // Get active contract for a member
  async getActiveContractForMember(memberId: string): Promise<Contract | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('member_id', '==', memberId),
      where('status', '==', 'active'),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToContract(snapshot.docs[0])
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

  // Get contracts needing sync
  async getContractsNeedingSync(): Promise<Contract[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sync_status', '==', 'pending'),
      limit(100)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToContract(doc))
  }

  // Get contract statistics
  async getStats(): Promise<{
    total: number
    active: number
    expired: number
    cancelled: number
    pending: number
    expiringThisMonth: number
  }> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const contracts = snapshot.docs.map(doc => this.docToContract(doc))

    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    return {
      total: contracts.length,
      active: contracts.filter(c => c.status === 'active').length,
      expired: contracts.filter(c => c.status === 'expired').length,
      cancelled: contracts.filter(c => c.status === 'cancelled').length,
      pending: contracts.filter(c => c.status === 'pending').length,
      expiringThisMonth: contracts.filter(c => {
        if (c.status !== 'active') return false
        const endDate = c.end_date instanceof Date ? c.end_date : new Date(c.end_date as string)
        return endDate >= now && endDate <= endOfMonth
      }).length
    }
  }
}

export default ContractsService.getInstance()
