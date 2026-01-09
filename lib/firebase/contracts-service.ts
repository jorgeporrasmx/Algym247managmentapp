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

export interface Contract {
  id?: string
  monday_item_id?: string

  // Contract Details
  member_id: string
  contract_type: string
  start_date: Date | Timestamp
  end_date: Date | Timestamp
  monthly_fee: number
  status: 'active' | 'inactive' | 'expired' | 'cancelled'

  // Payment Details
  payment_method?: string
  auto_renewal?: boolean
  terms?: string

  // Additional Info
  notes?: string
  signed_date?: Date | Timestamp
  cancellation_date?: Date | Timestamp
  cancellation_reason?: string

  // Sync Metadata
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
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

  // Create a new contract
  async createContract(contractData: Omit<Contract, 'id'>): Promise<Contract> {
    try {
      const docData = {
        ...contractData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

      return {
        ...contractData,
        id: docRef.id,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error creating contract:', error)
      throw error
    }
  }

  // Get a single contract by ID
  async getContract(id: string): Promise<Contract | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Contract
    } catch (error) {
      console.error('Error getting contract:', error)
      throw error
    }
  }

  // List contracts with pagination and filters
  async listContracts(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    member_id?: string
    contract_type?: string
  } = {}): Promise<{
    contracts: Contract[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    try {
      const { pageSize = 50, lastDoc, status, member_id, contract_type } = options

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

      if (contract_type) {
        q = query(q, where('contract_type', '==', contract_type))
      }

      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }

      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs
      const hasMore = docs.length > pageSize

      if (hasMore) {
        docs.pop()
      }

      const contracts: Contract[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contract))

      return {
        contracts,
        lastDoc: hasMore ? docs[docs.length - 1] : undefined,
        hasMore
      }
    } catch (error) {
      console.error('Error listing contracts:', error)
      throw error
    }
  }

  // Get contracts by member
  async getContractsByMember(memberId: string): Promise<Contract[]> {
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
      } as Contract))
    } catch (error) {
      console.error('Error getting contracts by member:', error)
      throw error
    }
  }

  // Get active contract for member
  async getActiveContractForMember(memberId: string): Promise<Contract | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('member_id', '==', memberId),
        where('status', '==', 'active'),
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
      } as Contract
    } catch (error) {
      console.error('Error getting active contract:', error)
      throw error
    }
  }

  // Update a contract
  async updateContract(id: string, updates: Partial<Contract>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)

      await updateDoc(docRef, {
        ...updates,
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error updating contract:', error)
      throw error
    }
  }

  // Cancel a contract
  async cancelContract(id: string, reason?: string): Promise<void> {
    try {
      await this.updateContract(id, {
        status: 'cancelled',
        cancellation_date: new Date(),
        cancellation_reason: reason,
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error cancelling contract:', error)
      throw error
    }
  }

  // Delete a contract (soft delete - changes status to inactive)
  async deleteContract(id: string): Promise<void> {
    try {
      await this.updateContract(id, {
        status: 'inactive',
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error deleting contract:', error)
      throw error
    }
  }

  // Hard delete a contract (permanent)
  async hardDeleteContract(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error hard deleting contract:', error)
      throw error
    }
  }

  // Search contracts by Monday item ID
  async searchByMondayId(mondayItemId: string): Promise<Contract | null> {
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
      } as Contract
    } catch (error) {
      console.error('Error searching by Monday ID:', error)
      throw error
    }
  }

  // Get contracts needing sync
  async getContractsNeedingSync(): Promise<Contract[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sync_status', '==', 'pending')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contract))
    } catch (error) {
      console.error('Error getting contracts needing sync:', error)
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

  // Get expiring contracts
  async getExpiringContracts(daysAhead: number = 30): Promise<Contract[]> {
    try {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + daysAhead)

      const q = query(
        collection(db, COLLECTION_NAME),
        where('status', '==', 'active'),
        where('end_date', '<=', Timestamp.fromDate(futureDate)),
        orderBy('end_date', 'asc')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Contract))
    } catch (error) {
      console.error('Error getting expiring contracts:', error)
      throw error
    }
  }

  // Get statistics
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    expired: number
    cancelled: number
    needingSync: number
  }> {
    try {
      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        expired: 0,
        cancelled: 0,
        needingSync: 0
      }

      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME))

      querySnapshot.docs.forEach(doc => {
        const contract = doc.data() as Contract
        stats.total++

        switch (contract.status) {
          case 'active':
            stats.active++
            break
          case 'inactive':
            stats.inactive++
            break
          case 'expired':
            stats.expired++
            break
          case 'cancelled':
            stats.cancelled++
            break
        }

        if (contract.sync_status === 'pending') {
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

export default ContractsService.getInstance()
