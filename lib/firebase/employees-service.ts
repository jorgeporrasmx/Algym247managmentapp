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
import { AccessLevel } from '@/lib/permissions'

export interface FirebaseEmployee {
  id?: string
  name: string
  first_name?: string
  paternal_last_name?: string
  maternal_last_name?: string
  email: string
  primary_phone: string
  secondary_phone?: string
  position: string
  department: string
  status: 'active' | 'inactive' | 'pending'
  hire_date?: string
  date_of_birth?: string
  address_1?: string
  city?: string
  state?: string
  zip_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  employee_id: string
  salary?: number
  access_level: AccessLevel | string
  manager?: string
  work_schedule?: string
  skills?: string
  certifications?: string
  notes?: string
  version?: string
  // Login credentials (stored in same document for simplicity)
  username?: string
  password_hash?: string
  last_login?: string
  created_at?: Date | Timestamp | string
  updated_at?: Date | Timestamp | string
}

const COLLECTION_NAME = 'employees'

function getFirestore() {
  if (!db) {
    throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  }
  return db
}

export class FirebaseEmployeesService {
  private static instance: FirebaseEmployeesService

  static getInstance(): FirebaseEmployeesService {
    if (!FirebaseEmployeesService.instance) {
      FirebaseEmployeesService.instance = new FirebaseEmployeesService()
    }
    return FirebaseEmployeesService.instance
  }

  async createEmployee(employeeData: Omit<FirebaseEmployee, 'id'>): Promise<FirebaseEmployee> {
    const firestore = getFirestore()

    const fullName = employeeData.name ||
      `${employeeData.first_name || ''} ${employeeData.paternal_last_name || ''}`.trim()

    const docData = {
      ...employeeData,
      name: fullName,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      version: employeeData.version || '1.0'
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), docData)

    return {
      ...employeeData,
      id: docRef.id,
      name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  async getEmployee(id: string): Promise<FirebaseEmployee | null> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return { id: docSnap.id, ...docSnap.data() } as FirebaseEmployee
  }

  async getEmployeeByUsername(username: string): Promise<FirebaseEmployee | null> {
    const q = query(
      collection(getFirestore(), COLLECTION_NAME),
      where('username', '==', username),
      where('status', '==', 'active'),
      limit(1)
    )

    const querySnapshot = await getDocs(q)
    if (querySnapshot.empty) {
      return null
    }

    const docSnap = querySnapshot.docs[0]
    return { id: docSnap.id, ...docSnap.data() } as FirebaseEmployee
  }

  async getEmployees(filters?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{
    employees: FirebaseEmployee[]
    total: number
    page: number
    totalPages: number
  }> {
    const pageNum = filters?.page || 1
    const pageLimit = filters?.limit || 50

    let q = query(
      collection(getFirestore(), COLLECTION_NAME),
      orderBy('created_at', 'desc')
    )

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status))
    }

    const querySnapshot = await getDocs(q)
    let employees: FirebaseEmployee[] = querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as FirebaseEmployee))

    // Client-side search filtering
    if (filters?.search) {
      const term = filters.search.toLowerCase()
      employees = employees.filter(emp =>
        emp.name?.toLowerCase().includes(term) ||
        emp.email?.toLowerCase().includes(term) ||
        emp.position?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term) ||
        emp.employee_id?.toLowerCase().includes(term)
      )
    }

    const total = employees.length
    const offset = (pageNum - 1) * pageLimit
    const paginatedEmployees = employees.slice(offset, offset + pageLimit)

    return {
      employees: paginatedEmployees,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / pageLimit)
    }
  }

  async updateEmployee(id: string, updates: Partial<FirebaseEmployee>): Promise<void> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)

    let fullName = updates.name
    if (updates.first_name || updates.paternal_last_name) {
      const employee = await this.getEmployee(id)
      if (employee) {
        fullName = `${updates.first_name || employee.first_name || ''} ${updates.paternal_last_name || employee.paternal_last_name || ''}`.trim()
      }
    }

    await updateDoc(docRef, {
      ...updates,
      ...(fullName ? { name: fullName } : {}),
      updated_at: serverTimestamp()
    })
  }

  async updateLastLogin(id: string): Promise<void> {
    const docRef = doc(getFirestore(), COLLECTION_NAME, id)
    await updateDoc(docRef, {
      last_login: new Date().toISOString()
    })
  }

  async deleteEmployee(id: string): Promise<void> {
    await this.updateEmployee(id, { status: 'inactive' })
  }

  async getStats(): Promise<{
    total: number
    active: number
    inactive: number
  }> {
    const stats = { total: 0, active: 0, inactive: 0 }

    const querySnapshot = await getDocs(collection(getFirestore(), COLLECTION_NAME))

    querySnapshot.docs.forEach(d => {
      const emp = d.data() as FirebaseEmployee
      stats.total++
      if (emp.status === 'active') stats.active++
      if (emp.status === 'inactive') stats.inactive++
    })

    return stats
  }
}

export default FirebaseEmployeesService.getInstance()
