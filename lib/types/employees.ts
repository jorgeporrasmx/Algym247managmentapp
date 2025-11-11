import { AccessLevel } from '@/lib/permissions'

export interface Employee {
  id: string
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
  access_level: AccessLevel
  manager?: string
  work_schedule?: string
  skills?: string
  certifications?: string
  notes?: string
  version?: string
  created_at: string
  updated_at?: string
}