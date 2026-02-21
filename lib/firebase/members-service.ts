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

export interface Member {
  id?: string
  monday_item_id?: string
  
  // Personal Information
  first_name: string
  paternal_last_name: string
  maternal_last_name?: string
  name?: string
  email: string
  primary_phone: string
  secondary_phone?: string
  date_of_birth?: Date | Timestamp
  
  // Address
  address_1?: string
  city?: string
  state?: string
  zip_code?: string
  
  // Membership
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  selected_plan?: string
  monthly_amount?: number
  start_date?: Date | Timestamp
  expiration_date?: Date | Timestamp
  access_type?: string
  
  // References
  employee?: string
  referred_member?: string
  member_id?: string
  
  // Payment
  direct_debit?: 'Domiciliado' | 'No domiciliado'
  
  // Other
  person?: string
  how_did_you_hear?: string
  contract_link?: string
  
  // Emergency Contact
  emergency_contact_name?: string
  emergency_contact_phone?: string
  
  // Sync Metadata
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp
  
  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
  version?: string
}

const COLLECTION_NAME = 'members'

// Helper to check if Firebase is available
function getFirestore() {
  if (!db) {
    throw new Error('Firebase not configured. Please set up Firebase environment variables.')
  }
  return db
}

export class MembersService {
  private static instance: MembersService
  
  static getInstance(): MembersService {
    if (!MembersService.instance) {
      MembersService.instance = new MembersService()
    }
    return MembersService.instance
  }

  // Check if Firebase is available
  isFirebaseConfigured(): boolean {
    return db !== null
  }
  
  // Create a new member
  async createMember(memberData: Omit<Member, 'id'>): Promise<Member> {
    try {
      const firestore = getFirestore()
      const fullName = memberData.name || 
        `${memberData.first_name} ${memberData.paternal_last_name}`.trim()
      
      const docData = {
        ...memberData,
        name: fullName,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'pending',
        version: memberData.version || '1.0'
      }
      
      const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData)
      
      return {
        ...memberData,
        id: docRef.id,
        name: fullName,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error creating member:', error)
      throw error
    }
  }
  
  // Get a single member by ID
  async getMember(id: string): Promise<Member | null> {
    try {
      const docRef = doc(getFirestore(), COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)
      
      if (!docSnap.exists()) {
        return null
      }
      
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Member
    } catch (error) {
      console.error('Error getting member:', error)
      throw error
    }
  }
  
  // List members with pagination and filters
  async listMembers(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    searchTerm?: string
  } = {}): Promise<{
    members: Member[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    try {
      const { pageSize = 50, lastDoc, status, searchTerm } = options
      
      let q = query(
        collection(getFirestore(), COLLECTION_NAME),
        orderBy('created_at', 'desc'),
        limit(pageSize + 1)
      )
      
      if (status) {
        q = query(q, where('status', '==', status))
      }
      
      if (lastDoc) {
        q = query(q, startAfter(lastDoc))
      }
      
      const querySnapshot = await getDocs(q)
      const docs = querySnapshot.docs
      const hasMore = docs.length > pageSize
      
      if (hasMore) {
        docs.pop() // Remove the extra document
      }
      
      let members: Member[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Member))
      
      // Client-side search filtering (for now)
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        members = members.filter(member =>
          member.name?.toLowerCase().includes(term) ||
          member.email?.toLowerCase().includes(term) ||
          member.primary_phone?.includes(term) ||
          member.first_name?.toLowerCase().includes(term) ||
          member.paternal_last_name?.toLowerCase().includes(term)
        )
      }
      
      return {
        members,
        lastDoc: hasMore ? docs[docs.length - 1] : undefined,
        hasMore
      }
    } catch (error) {
      console.error('Error listing members:', error)
      throw error
    }
  }
  
  // Update a member
  async updateMember(id: string, updates: Partial<Member>): Promise<void> {
    try {
      const docRef = doc(getFirestore(), COLLECTION_NAME, id)
      
      // Generate full name if name parts are updated
      let fullName = updates.name
      if (updates.first_name || updates.paternal_last_name) {
        const member = await this.getMember(id)
        if (member) {
          fullName = `${updates.first_name || member.first_name} ${updates.paternal_last_name || member.paternal_last_name}`.trim()
        }
      }
      
      await updateDoc(docRef, {
        ...updates,
        name: fullName || updates.name,
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error updating member:', error)
      throw error
    }
  }
  
  // Delete a member (soft delete - changes status to inactive)
  async deleteMember(id: string): Promise<void> {
    try {
      await this.updateMember(id, {
        status: 'inactive',
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error deleting member:', error)
      throw error
    }
  }
  
  // Hard delete a member (permanent)
  async hardDeleteMember(id: string): Promise<void> {
    try {
      const docRef = doc(getFirestore(), COLLECTION_NAME, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error hard deleting member:', error)
      throw error
    }
  }
  
  // Search members by various criteria
  async searchMembers(criteria: {
    email?: string
    phone?: string
    member_id?: string
    monday_item_id?: string
  }): Promise<Member[]> {
    try {
      let q = query(collection(getFirestore(), COLLECTION_NAME))
      
      if (criteria.email) {
        q = query(q, where('email', '==', criteria.email))
      } else if (criteria.phone) {
        q = query(q, where('primary_phone', '==', criteria.phone))
      } else if (criteria.member_id) {
        q = query(q, where('member_id', '==', criteria.member_id))
      } else if (criteria.monday_item_id) {
        q = query(q, where('monday_item_id', '==', criteria.monday_item_id))
      }
      
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Member))
    } catch (error) {
      console.error('Error searching members:', error)
      throw error
    }
  }
  
  // Get members needing sync
  async getMembersNeedingSync(): Promise<Member[]> {
    try {
      const q = query(
        collection(getFirestore(), COLLECTION_NAME),
        where('sync_status', '==', 'pending')
      )
      
      const querySnapshot = await getDocs(q)
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Member))
    } catch (error) {
      console.error('Error getting members needing sync:', error)
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
      
      const docRef = doc(getFirestore(), COLLECTION_NAME, id)
      await updateDoc(docRef, updates)
    } catch (error) {
      console.error('Error updating sync status:', error)
      throw error
    }
  }
  
  // Get statistics
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    pending: number
    suspended: number
    needingSync: number
  }> {
    try {
      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        suspended: 0,
        needingSync: 0
      }
      
      // Get all members for stats (in production, use aggregation queries)
      const querySnapshot = await getDocs(collection(getFirestore(), COLLECTION_NAME))
      
      querySnapshot.docs.forEach(doc => {
        const member = doc.data() as Member
        stats.total++
        
        switch (member.status) {
          case 'active':
            stats.active++
            break
          case 'inactive':
            stats.inactive++
            break
          case 'pending':
            stats.pending++
            break
          case 'suspended':
            stats.suspended++
            break
        }
        
        if (member.sync_status === 'pending') {
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

// Singleton instance
const membersServiceInstance = MembersService.getInstance()

// Export individual functions for backwards compatibility
export const getMembers = membersServiceInstance.listMembers.bind(membersServiceInstance)
export const getMemberById = membersServiceInstance.getMember.bind(membersServiceInstance)
export const getMemberByMondayId = (mondayId: string) => 
  membersServiceInstance.searchMembers({ monday_item_id: mondayId }).then(members => members[0] || null)
export const createMember = membersServiceInstance.createMember.bind(membersServiceInstance)
export const updateMember = membersServiceInstance.updateMember.bind(membersServiceInstance)
export const deleteMember = membersServiceInstance.deleteMember.bind(membersServiceInstance)

export default membersServiceInstance