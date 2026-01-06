import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from './config'
import { EmployeesService, Employee } from './employees-service'
import { AccessLevel, hasPermission, Permission } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

// Employee credentials stored in Firestore (when not using Firebase Admin SDK)
export interface EmployeeCredentials {
  id?: string
  employee_id: string  // Reference to employees collection document ID
  email: string        // Email used for login (same as employee email)
  password_hash: string
  access_level: AccessLevel
  is_active: boolean
  last_login?: Date | Timestamp
  login_attempts?: number
  locked_until?: Date | Timestamp
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

// Session data returned after login
export interface EmployeeSession {
  employee: Employee
  accessLevel: AccessLevel
  permissions: Permission[]
  loginAt: Date
}

const CREDENTIALS_COLLECTION = 'employee_credentials'
const SALT_ROUNDS = 12
const MAX_LOGIN_ATTEMPTS = 5
const LOCK_DURATION_MS = 15 * 60 * 1000 // 15 minutes

export class EmployeeAuthService {
  private static instance: EmployeeAuthService

  static getInstance(): EmployeeAuthService {
    if (!EmployeeAuthService.instance) {
      EmployeeAuthService.instance = new EmployeeAuthService()
    }
    return EmployeeAuthService.instance
  }

  // Create login credentials for an employee
  async createCredentials(
    employeeId: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const employeesService = EmployeesService.getInstance()
      const employee = await employeesService.getEmployee(employeeId)

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      // Check if credentials already exist
      const existingCreds = await this.getCredentialsByEmail(employee.email)
      if (existingCreds) {
        return { success: false, error: 'Credentials already exist for this employee' }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

      // Create credentials document
      const credentialsData: Omit<EmployeeCredentials, 'id'> = {
        employee_id: employeeId,
        email: employee.email.toLowerCase(),
        password_hash: passwordHash,
        access_level: employee.access_level,
        is_active: true,
        login_attempts: 0,
        created_at: serverTimestamp() as unknown as Date,
        updated_at: serverTimestamp() as unknown as Date
      }

      await addDoc(collection(db, CREDENTIALS_COLLECTION), credentialsData)

      // Update employee to mark as having login
      await employeesService.setLoginCredentials(employeeId, 'local')

      return { success: true }
    } catch (error) {
      console.error('Error creating credentials:', error)
      return { success: false, error: 'Failed to create credentials' }
    }
  }

  // Get credentials by email
  private async getCredentialsByEmail(email: string): Promise<EmployeeCredentials | null> {
    try {
      const q = query(
        collection(db, CREDENTIALS_COLLECTION),
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
      } as EmployeeCredentials
    } catch (error) {
      console.error('Error getting credentials:', error)
      return null
    }
  }

  // Authenticate employee
  async login(
    email: string,
    password: string
  ): Promise<{ success: boolean; session?: EmployeeSession; error?: string }> {
    try {
      // Get credentials
      const credentials = await this.getCredentialsByEmail(email)

      if (!credentials) {
        return { success: false, error: 'Invalid email or password' }
      }

      if (!credentials.is_active) {
        return { success: false, error: 'Account is deactivated' }
      }

      // Check if account is locked
      if (credentials.locked_until) {
        const lockUntil = credentials.locked_until instanceof Timestamp
          ? credentials.locked_until.toDate()
          : new Date(credentials.locked_until)

        if (lockUntil > new Date()) {
          const minutesLeft = Math.ceil((lockUntil.getTime() - Date.now()) / 60000)
          return {
            success: false,
            error: `Account is locked. Try again in ${minutesLeft} minutes.`
          }
        }
      }

      // Verify password
      const isValid = await bcrypt.compare(password, credentials.password_hash)

      if (!isValid) {
        // Increment login attempts
        await this.incrementLoginAttempts(credentials.id!)
        return { success: false, error: 'Invalid email or password' }
      }

      // Get employee data
      const employeesService = EmployeesService.getInstance()
      const employee = await employeesService.getEmployee(credentials.employee_id)

      if (!employee) {
        return { success: false, error: 'Employee record not found' }
      }

      if (employee.status !== 'active') {
        return { success: false, error: 'Employee account is not active' }
      }

      // Reset login attempts and update last login
      await this.resetLoginAttempts(credentials.id!)
      await employeesService.updateLastLogin(employee.id!)

      // Build session
      const session: EmployeeSession = {
        employee,
        accessLevel: employee.access_level,
        permissions: this.getPermissionsForLevel(employee.access_level),
        loginAt: new Date()
      }

      return { success: true, session }
    } catch (error) {
      console.error('Error during login:', error)
      return { success: false, error: 'Login failed. Please try again.' }
    }
  }

  // Increment failed login attempts
  private async incrementLoginAttempts(credentialsId: string): Promise<void> {
    try {
      const docRef = doc(db, CREDENTIALS_COLLECTION, credentialsId)
      const docSnap = await getDoc(docRef)

      if (!docSnap.exists()) return

      const data = docSnap.data() as EmployeeCredentials
      const attempts = (data.login_attempts || 0) + 1

      const updateData: Record<string, unknown> = {
        login_attempts: attempts,
        updated_at: serverTimestamp()
      }

      // Lock account if max attempts reached
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.locked_until = new Date(Date.now() + LOCK_DURATION_MS)
      }

      await updateDoc(docRef, updateData)
    } catch (error) {
      console.error('Error incrementing login attempts:', error)
    }
  }

  // Reset login attempts after successful login
  private async resetLoginAttempts(credentialsId: string): Promise<void> {
    try {
      const docRef = doc(db, CREDENTIALS_COLLECTION, credentialsId)
      await updateDoc(docRef, {
        login_attempts: 0,
        locked_until: null,
        last_login: serverTimestamp(),
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error resetting login attempts:', error)
    }
  }

  // Change password
  async changePassword(
    email: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const credentials = await this.getCredentialsByEmail(email)

      if (!credentials) {
        return { success: false, error: 'Account not found' }
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, credentials.password_hash)
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

      // Update password
      const docRef = doc(db, CREDENTIALS_COLLECTION, credentials.id!)
      await updateDoc(docRef, {
        password_hash: newPasswordHash,
        updated_at: serverTimestamp()
      })

      return { success: true }
    } catch (error) {
      console.error('Error changing password:', error)
      return { success: false, error: 'Failed to change password' }
    }
  }

  // Reset password (admin action)
  async resetPassword(
    employeeId: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const employeesService = EmployeesService.getInstance()
      const employee = await employeesService.getEmployee(employeeId)

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      const credentials = await this.getCredentialsByEmail(employee.email)

      if (!credentials) {
        return { success: false, error: 'No login credentials found for this employee' }
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)

      // Update password and unlock account
      const docRef = doc(db, CREDENTIALS_COLLECTION, credentials.id!)
      await updateDoc(docRef, {
        password_hash: newPasswordHash,
        login_attempts: 0,
        locked_until: null,
        updated_at: serverTimestamp()
      })

      return { success: true }
    } catch (error) {
      console.error('Error resetting password:', error)
      return { success: false, error: 'Failed to reset password' }
    }
  }

  // Deactivate credentials
  async deactivateCredentials(employeeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const employeesService = EmployeesService.getInstance()
      const employee = await employeesService.getEmployee(employeeId)

      if (!employee) {
        return { success: false, error: 'Employee not found' }
      }

      const credentials = await this.getCredentialsByEmail(employee.email)

      if (!credentials) {
        return { success: false, error: 'No credentials found' }
      }

      const docRef = doc(db, CREDENTIALS_COLLECTION, credentials.id!)
      await updateDoc(docRef, {
        is_active: false,
        updated_at: serverTimestamp()
      })

      return { success: true }
    } catch (error) {
      console.error('Error deactivating credentials:', error)
      return { success: false, error: 'Failed to deactivate credentials' }
    }
  }

  // Get permissions for access level
  private getPermissionsForLevel(level: AccessLevel): Permission[] {
    const allPermissions = Object.values(Permission)
    return allPermissions.filter(permission => hasPermission(level, permission))
  }

  // Check if employee has specific permission
  checkPermission(session: EmployeeSession, permission: Permission): boolean {
    return session.permissions.includes(permission)
  }

  // Check if employee can manage another employee
  canManageEmployee(managerSession: EmployeeSession, targetAccessLevel: AccessLevel): boolean {
    const managerLevel = managerSession.accessLevel

    // Directors can manage everyone
    if (managerLevel === AccessLevel.DIRECCION) {
      return true
    }

    // Managers can manage lower levels
    if (managerLevel === AccessLevel.GERENTE) {
      return ![AccessLevel.DIRECCION, AccessLevel.GERENTE].includes(targetAccessLevel)
    }

    // Others cannot manage employees
    return false
  }
}

// Export singleton instance
export default EmployeeAuthService.getInstance()
