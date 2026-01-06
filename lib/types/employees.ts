import { AccessLevel } from '@/lib/permissions'
import { Timestamp } from 'firebase/firestore'

// Unified Employee interface used across the application
export interface Employee {
  id?: string
  monday_item_id?: string

  // Personal Information
  name: string
  first_name?: string
  paternal_last_name?: string
  maternal_last_name?: string
  email: string
  primary_phone: string
  secondary_phone?: string
  phone?: string // Alias for primary_phone (legacy support)
  date_of_birth?: Date | Timestamp | string

  // Address
  address_1?: string
  city?: string
  state?: string
  zip_code?: string

  // Employment Information
  employee_id: string  // Internal ID (EMP001, EMP002, etc.)
  position: string
  department: string
  status: 'active' | 'inactive' | 'pending' | 'terminated'
  hire_date?: Date | Timestamp | string
  salary?: number
  access_level: AccessLevel | string
  manager?: string
  work_schedule?: string

  // Skills & Certifications
  skills?: string
  certifications?: string

  // Emergency Contact
  emergency_contact_name?: string
  emergency_contact_phone?: string

  // Additional
  notes?: string
  version?: string

  // Authentication
  firebase_uid?: string
  has_login?: boolean
  last_login?: Date | Timestamp | string

  // Sync Metadata (Monday.com)
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp | string

  // System Metadata
  created_at?: Date | Timestamp | string
  updated_at?: Date | Timestamp | string
}

// Employee credentials for authentication
export interface EmployeeCredentials {
  employee_id: string
  email: string
  password_hash: string
  is_active: boolean
  failed_login_attempts: number
  locked_until?: Date | Timestamp
  last_login?: Date | Timestamp
  created_at: Date | Timestamp
  updated_at: Date | Timestamp
}

// Employee session data
export interface EmployeeSession {
  employee: Employee
  accessLevel: AccessLevel
  permissions: string[]
  loginAt: Date
}
