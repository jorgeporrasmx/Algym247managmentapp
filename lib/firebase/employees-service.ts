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
  getCountFromServer,
  DocumentData,
  QueryDocumentSnapshot,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'
import { Employee } from '@/lib/types/employees'

// Re-export for convenience
export type { Employee } from '@/lib/types/employees'

const COLLECTION_NAME = 'employees'

export class EmployeesService {
  private static instance: EmployeesService

  static getInstance(): EmployeesService {
    if (!EmployeesService.instance) {
      EmployeesService.instance = new EmployeesService()
    }
    return EmployeesService.instance
  }

  // Generate next employee ID
  private async generateEmployeeId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().employee_id)
      .filter(id => id && id.startsWith('EMP'))
      .map(id => parseInt(id.replace('EMP', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `EMP${String(maxId + 1).padStart(3, '0')}`
  }

  // Create a new employee
  async createEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      const fullName = employeeData.name ||
        `${employeeData.first_name || ''} ${employeeData.paternal_last_name || ''}`.trim()

      const employeeId = employeeData.employee_id || await this.generateEmployeeId()

      const docData = {
        ...employeeData,
        name: fullName,
        employee_id: employeeId,
        status: employeeData.status || 'active',
        has_login: false,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        sync_status: 'pending',
        version: employeeData.version || '1.0'
      }

      const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

      return {
        ...employeeData,
        id: docRef.id,
        name: fullName,
        employee_id: employeeId,
        created_at: new Date(),
        updated_at: new Date()
      }
    } catch (error) {
      console.error('Error creating employee:', error)
      throw error
    }
  }

  // Get a single employee by Firestore document ID
  async getEmployee(id: string): Promise<Employee | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) {
        return null
      }

      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Employee
    } catch (error) {
      console.error('Error getting employee:', error)
      throw error
    }
  }

  // Get employee by internal employee_id (EMP001, etc.)
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('employee_id', '==', employeeId)
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      } as Employee
    } catch (error) {
      console.error('Error getting employee by employee_id:', error)
      throw error
    }
  }

  // Get employee by email
  async getEmployeeByEmail(email: string): Promise<Employee | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('email', '==', email.toLowerCase())
      )

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        return null
      }

      const doc = querySnapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data()
      } as Employee
    } catch (error) {
      console.error('Error getting employee by email:', error)
      throw error
    }
  }

  // List employees with pagination and filters
  async listEmployees(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    department?: string
    accessLevel?: AccessLevel
    searchTerm?: string
  } = {}): Promise<{
    employees: Employee[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    try {
      const { pageSize = 50, lastDoc, status, department, accessLevel, searchTerm } = options

      let q = query(
        collection(db, COLLECTION_NAME),
        orderBy('created_at', 'desc'),
        limit(pageSize + 1)
      )

      if (status) {
        q = query(q, where('status', '==', status))
      }

      if (department) {
        q = query(q, where('department', '==', department))
      }

      if (accessLevel) {
        q = query(q, where('access_level', '==', accessLevel))
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

      let employees: Employee[] = docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))

      // Client-side search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        employees = employees.filter(employee =>
          employee.name?.toLowerCase().includes(term) ||
          employee.email?.toLowerCase().includes(term) ||
          employee.primary_phone?.includes(term) ||
          employee.employee_id?.toLowerCase().includes(term) ||
          employee.position?.toLowerCase().includes(term) ||
          employee.department?.toLowerCase().includes(term)
        )
      }

      return {
        employees,
        lastDoc: hasMore ? docs[docs.length - 1] : undefined,
        hasMore
      }
    } catch (error) {
      console.error('Error listing employees:', error)
      throw error
    }
  }

  // Simple list for API compatibility
  async getEmployees(filters?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{
    employees: Employee[]
    total: number
    page: number
    totalPages: number
  }> {
    try {
      const pageSize = filters?.limit || 50
      const page = filters?.page || 1

      // Get all employees (for pagination calculation)
      let q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'))

      if (filters?.status) {
        q = query(q, where('status', '==', filters.status))
      }

      const allDocs = await getDocs(q)
      let allEmployees = allDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))

      // Apply search filter
      if (filters?.search) {
        const term = filters.search.toLowerCase()
        allEmployees = allEmployees.filter(employee =>
          employee.name?.toLowerCase().includes(term) ||
          employee.email?.toLowerCase().includes(term) ||
          employee.primary_phone?.includes(term) ||
          employee.employee_id?.toLowerCase().includes(term) ||
          employee.position?.toLowerCase().includes(term)
        )
      }

      const total = allEmployees.length
      const totalPages = Math.ceil(total / pageSize)
      const offset = (page - 1) * pageSize
      const paginatedEmployees = allEmployees.slice(offset, offset + pageSize)

      return {
        employees: paginatedEmployees,
        total,
        page,
        totalPages
      }
    } catch (error) {
      console.error('Error getting employees:', error)
      throw error
    }
  }

  // Update an employee
  async updateEmployee(id: string, updates: Partial<Employee>): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)

      // Generate full name if name parts are updated
      let fullName = updates.name
      if (updates.first_name || updates.paternal_last_name) {
        const employee = await this.getEmployee(id)
        if (employee) {
          fullName = `${updates.first_name || employee.first_name || ''} ${updates.paternal_last_name || employee.paternal_last_name || ''}`.trim()
        }
      }

      await updateDoc(docRef, {
        ...updates,
        name: fullName || updates.name,
        updated_at: serverTimestamp(),
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error updating employee:', error)
      throw error
    }
  }

  // Soft delete an employee (changes status to terminated)
  async deleteEmployee(id: string): Promise<void> {
    try {
      await this.updateEmployee(id, {
        status: 'terminated',
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error deleting employee:', error)
      throw error
    }
  }

  // Hard delete an employee (permanent)
  async hardDeleteEmployee(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Error hard deleting employee:', error)
      throw error
    }
  }

  // Search employees by various criteria
  async searchEmployees(criteria: {
    email?: string
    phone?: string
    employee_id?: string
    monday_item_id?: string
  }): Promise<Employee[]> {
    try {
      let q = query(collection(db, COLLECTION_NAME))

      // Apply all provided criteria (not mutually exclusive)
      if (criteria.email) {
        q = query(q, where('email', '==', criteria.email.toLowerCase()))
      }
      if (criteria.phone) {
        q = query(q, where('primary_phone', '==', criteria.phone))
      }
      if (criteria.employee_id) {
        q = query(q, where('employee_id', '==', criteria.employee_id))
      }
      if (criteria.monday_item_id) {
        q = query(q, where('monday_item_id', '==', criteria.monday_item_id))
      }

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))
    } catch (error) {
      console.error('Error searching employees:', error)
      throw error
    }
  }

  // Get employees needing sync with Monday.com
  async getEmployeesNeedingSync(): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('sync_status', '==', 'pending')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))
    } catch (error) {
      console.error('Error getting employees needing sync:', error)
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
      const updates: Partial<Employee> = {
        sync_status: status,
        last_synced_at: new Date()
      }

      if (error) {
        updates.sync_error = error
      }

      if (mondayItemId) {
        updates.monday_item_id = mondayItemId
      }

      const docRef = doc(db, COLLECTION_NAME, id)
      await updateDoc(docRef, {
        ...updates,
        last_synced_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating sync status:', error)
      throw error
    }
  }

  // Set login credentials reference
  async setLoginCredentials(id: string, firebaseUid: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      await updateDoc(docRef, {
        firebase_uid: firebaseUid,
        has_login: true,
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error setting login credentials:', error)
      throw error
    }
  }

  // Update last login timestamp
  async updateLastLogin(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id)
      await updateDoc(docRef, {
        last_login: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating last login:', error)
      throw error
    }
  }

  // Get statistics using server-side aggregation for efficiency
  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
    pending: number
    terminated: number
    needingSync: number
    byDepartment: Record<string, number>
    byAccessLevel: Record<string, number>
  }> {
    try {
      const collectionRef = collection(db, COLLECTION_NAME)

      // Use server-side aggregation for status counts (runs in parallel)
      const [
        totalSnapshot,
        activeSnapshot,
        inactiveSnapshot,
        pendingSnapshot,
        terminatedSnapshot,
        needingSyncSnapshot
      ] = await Promise.all([
        getCountFromServer(collectionRef),
        getCountFromServer(query(collectionRef, where('status', '==', 'active'))),
        getCountFromServer(query(collectionRef, where('status', '==', 'inactive'))),
        getCountFromServer(query(collectionRef, where('status', '==', 'pending'))),
        getCountFromServer(query(collectionRef, where('status', '==', 'terminated'))),
        getCountFromServer(query(collectionRef, where('sync_status', '==', 'pending')))
      ])

      // For grouping by department and access level, we need to fetch documents
      // since Firestore doesn't support GROUP BY aggregations
      const byDepartment: Record<string, number> = {}
      const byAccessLevel: Record<string, number> = {}

      const querySnapshot = await getDocs(collectionRef)
      querySnapshot.docs.forEach(doc => {
        const employee = doc.data() as Employee

        if (employee.department) {
          byDepartment[employee.department] = (byDepartment[employee.department] || 0) + 1
        }

        if (employee.access_level) {
          byAccessLevel[employee.access_level] = (byAccessLevel[employee.access_level] || 0) + 1
        }
      })

      return {
        total: totalSnapshot.data().count,
        active: activeSnapshot.data().count,
        inactive: inactiveSnapshot.data().count,
        pending: pendingSnapshot.data().count,
        terminated: terminatedSnapshot.data().count,
        needingSync: needingSyncSnapshot.data().count,
        byDepartment,
        byAccessLevel
      }
    } catch (error) {
      console.error('Error getting stats:', error)
      throw error
    }
  }
}

// Export singleton instance
export default EmployeesService.getInstance()
