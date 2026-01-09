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

export interface Employee {
  id?: string
  monday_item_id?: string
  employee_id?: string

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

  // Employment Details
  position: string
  department: string
  status: 'active' | 'inactive' | 'pending' | 'terminated'
  hire_date: Date | Timestamp
  termination_date?: Date | Timestamp
  access_level: 'admin' | 'manager' | 'staff' | 'limited'

  // Compensation
  salary?: number
  work_schedule?: 'full_time' | 'part_time' | 'contract' | 'intern'

  // Additional Info
  manager?: string
  skills?: string
  certifications?: string
  notes?: string

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

const COLLECTION_NAME = 'employees'

export class EmployeesService {
  private static instance: EmployeesService

  static getInstance(): EmployeesService {
    if (!EmployeesService.instance) {
      EmployeesService.instance = new EmployeesService()
    }
    return EmployeesService.instance
  }

  // Create a new employee
  async createEmployee(employeeData: Omit<Employee, 'id'>): Promise<Employee> {
    try {
      const fullName = employeeData.name ||
        `${employeeData.first_name} ${employeeData.paternal_last_name}`.trim()

      // Generate employee_id if not provided
      const employeeId = employeeData.employee_id ||
        `EMP-${Date.now().toString(36).toUpperCase()}`

      const docData = {
        ...employeeData,
        name: fullName,
        employee_id: employeeId,
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

  // Get a single employee by ID
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

  // Get employee by employee_id
  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee | null> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('employee_id', '==', employeeId),
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
      } as Employee
    } catch (error) {
      console.error('Error getting employee by employee_id:', error)
      throw error
    }
  }

  // List employees with pagination and filters
  async listEmployees(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    status?: string
    department?: string
    position?: string
    access_level?: string
    searchTerm?: string
  } = {}): Promise<{
    employees: Employee[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    try {
      const { pageSize = 50, lastDoc, status, department, position, access_level, searchTerm } = options

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

      if (position) {
        q = query(q, where('position', '==', position))
      }

      if (access_level) {
        q = query(q, where('access_level', '==', access_level))
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
          employee.first_name?.toLowerCase().includes(term) ||
          employee.paternal_last_name?.toLowerCase().includes(term)
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

  // Get employees by department
  async getEmployeesByDepartment(department: string): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('department', '==', department),
        where('status', '==', 'active'),
        orderBy('name', 'asc')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))
    } catch (error) {
      console.error('Error getting employees by department:', error)
      throw error
    }
  }

  // Get employees by access level
  async getEmployeesByAccessLevel(accessLevel: string): Promise<Employee[]> {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('access_level', '==', accessLevel),
        where('status', '==', 'active')
      )

      const querySnapshot = await getDocs(q)

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Employee))
    } catch (error) {
      console.error('Error getting employees by access level:', error)
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
          fullName = `${updates.first_name || employee.first_name} ${updates.paternal_last_name || employee.paternal_last_name}`.trim()
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

  // Terminate an employee
  async terminateEmployee(id: string, reason?: string): Promise<void> {
    try {
      await this.updateEmployee(id, {
        status: 'terminated',
        termination_date: new Date(),
        notes: reason,
        sync_status: 'pending'
      })
    } catch (error) {
      console.error('Error terminating employee:', error)
      throw error
    }
  }

  // Delete an employee (soft delete - changes status to inactive)
  async deleteEmployee(id: string): Promise<void> {
    try {
      await this.updateEmployee(id, {
        status: 'inactive',
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

      if (criteria.email) {
        q = query(q, where('email', '==', criteria.email))
      } else if (criteria.phone) {
        q = query(q, where('primary_phone', '==', criteria.phone))
      } else if (criteria.employee_id) {
        q = query(q, where('employee_id', '==', criteria.employee_id))
      } else if (criteria.monday_item_id) {
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

  // Search by Monday item ID
  async searchByMondayId(mondayItemId: string): Promise<Employee | null> {
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
      } as Employee
    } catch (error) {
      console.error('Error searching by Monday ID:', error)
      throw error
    }
  }

  // Get employees needing sync
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
    active: number
    inactive: number
    pending: number
    terminated: number
    byDepartment: Record<string, number>
    byAccessLevel: Record<string, number>
    needingSync: number
  }> {
    try {
      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        pending: 0,
        terminated: 0,
        byDepartment: {} as Record<string, number>,
        byAccessLevel: {} as Record<string, number>,
        needingSync: 0
      }

      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME))

      querySnapshot.docs.forEach(doc => {
        const employee = doc.data() as Employee
        stats.total++

        switch (employee.status) {
          case 'active':
            stats.active++
            break
          case 'inactive':
            stats.inactive++
            break
          case 'pending':
            stats.pending++
            break
          case 'terminated':
            stats.terminated++
            break
        }

        // Count by department
        if (employee.department) {
          stats.byDepartment[employee.department] = (stats.byDepartment[employee.department] || 0) + 1
        }

        // Count by access level
        if (employee.access_level) {
          stats.byAccessLevel[employee.access_level] = (stats.byAccessLevel[employee.access_level] || 0) + 1
        }

        if (employee.sync_status === 'pending') {
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

export default EmployeesService.getInstance()
