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

export interface Contract {
  id?: string
  member_id: string
  member_name?: string
  member_email?: string
  monday_contract_id?: string
  contract_type: string
  start_date?: Date | Timestamp | string
  end_date?: Date | Timestamp | string
  monthly_fee?: number
  status: 'active' | 'inactive' | 'pending' | 'expired' | 'cancelled'
  notes?: string
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

const COLLECTION_NAME = 'contracts'

function getFirestore() {
  if (!db) {
    throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  }
  return db
}

export class ContractsService {
  private static instance: ContractsService

  static getInstance(): ContractsService {
    if (!ContractsService.instance) {
      ContractsService.instance = new ContractsService()
    }
    return ContractsService.instance
  }

  async createContract(contractData: Omit<Contract, 'id'>): Promise<Contract> {
    const firestore = getFirestore()

    const docData = {
      ...contractData,
      monday_contract_id: contractData.monday_contract_id || `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData)

    return {
      ...contractData,
      id: docRef.id,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  async getContract(id: string): Promise<Contract | null> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return { id: docSnap.id, ...docSnap.data() } as Contract
  }

  async listContracts(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    memberId?: string
    contractType?: string
  } = {}): Promise<{
    contracts: Contract[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    const { pageSize = 50, lastDoc: lastDocument, status, memberId, contractType } = options

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

    if (contractType) {
      q = query(q, where('contract_type', '==', contractType))
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

    const contracts: Contract[] = docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Contract))

    return {
      contracts,
      lastDoc: hasMore ? docs[docs.length - 1] : undefined,
      hasMore
    }
  }

  async updateContract(id: string, updates: Partial<Contract>): Promise<void> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    })
  }

  async getContractsByMember(memberId: string): Promise<Contract[]> {
    const q = query(
      collection(getFirestore(), COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('created_at', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Contract))
  }

  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    pending: number
    expired: number
  }> {
    const stats = { total: 0, active: 0, inactive: 0, pending: 0, expired: 0 }

    const querySnapshot = await getDocs(collection(getFirestore(), COLLECTION_NAME))

    querySnapshot.docs.forEach(d => {
      const contract = d.data() as Contract
      stats.total++

      switch (contract.status) {
        case 'active': stats.active++; break
        case 'inactive': stats.inactive++; break
        case 'pending': stats.pending++; break
        case 'expired': stats.expired++; break
      }
    })

    return stats
  }
}

export default ContractsService.getInstance()
