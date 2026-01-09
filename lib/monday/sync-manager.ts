import MembersService, { Member } from '@/lib/firebase/members-service'
import ContractsService, { Contract } from '@/lib/firebase/contracts-service'
import PaymentsService, { Payment } from '@/lib/firebase/payments-service'
import EmployeesService, { Employee } from '@/lib/firebase/employees-service'
import MondayMembersAPI from './members-api'
import MondayContractsAPI from './contracts-api'
import MondayPaymentsAPI from './payments-api'
import MondayEmployeesAPI from './employees-api'
import { RATE_LIMIT } from './config'

export type EntityType = 'members' | 'contracts' | 'payments' | 'employees'

export interface SyncResult {
  success: boolean
  entityType: EntityType
  entityId?: string
  mondayItemId?: string
  error?: string
  action: 'created' | 'updated' | 'deleted' | 'skipped'
}

export interface SyncReport {
  entityType: EntityType | 'all'
  totalProcessed: number
  successful: number
  failed: number
  results: SyncResult[]
  startTime: Date
  endTime: Date
  duration: number
}

export interface FullSyncReport {
  members: SyncReport
  contracts: SyncReport
  payments: SyncReport
  employees: SyncReport
  totalDuration: number
}

export class MondaySyncManager {
  private static instance: MondaySyncManager
  private syncInProgress: boolean = false
  private currentSyncEntity: EntityType | null = null

  static getInstance(): MondaySyncManager {
    if (!MondaySyncManager.instance) {
      MondaySyncManager.instance = new MondaySyncManager()
    }
    return MondaySyncManager.instance
  }

  // Helper to add delay between requests (rate limiting)
  private async delay(ms: number = RATE_LIMIT.delayBetweenRequests): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms))
  }

  // ==================== MEMBERS SYNC ====================

  async syncMemberToMonday(memberId: string): Promise<SyncResult> {
    try {
      const member = await MembersService.getMember(memberId)

      if (!member) {
        return {
          success: false,
          entityType: 'members',
          entityId: memberId,
          error: 'Member not found',
          action: 'skipped'
        }
      }

      let result: SyncResult

      if (member.monday_item_id) {
        try {
          await MondayMembersAPI.updateMemberInMonday(member.monday_item_id, member)
          result = {
            success: true,
            entityType: 'members',
            entityId: memberId,
            mondayItemId: member.monday_item_id,
            action: 'updated'
          }
        } catch (updateError) {
          console.log('Update failed, trying to create new item:', updateError)
          const newMondayId = await MondayMembersAPI.createMemberInMonday(member)
          result = {
            success: true,
            entityType: 'members',
            entityId: memberId,
            mondayItemId: newMondayId,
            action: 'created'
          }
        }
      } else {
        const mondayItemId = await MondayMembersAPI.createMemberInMonday(member)
        result = {
          success: true,
          entityType: 'members',
          entityId: memberId,
          mondayItemId,
          action: 'created'
        }
      }

      await MembersService.updateSyncStatus(memberId, 'synced', undefined, result.mondayItemId)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await MembersService.updateSyncStatus(memberId, 'error', errorMessage)
      return {
        success: false,
        entityType: 'members',
        entityId: memberId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }

  async syncMemberFromMonday(mondayItemId: string): Promise<SyncResult> {
    try {
      const mondayMember = await MondayMembersAPI.getMemberFromMonday(mondayItemId)

      if (!mondayMember) {
        return {
          success: false,
          entityType: 'members',
          mondayItemId,
          error: 'Monday member not found',
          action: 'skipped'
        }
      }

      const memberData = MondayMembersAPI.mondayToFirebaseMember(mondayMember)
      const existingMembers = await MembersService.searchMembers({ monday_item_id: mondayItemId })

      let result: SyncResult

      if (existingMembers.length > 0) {
        const existingMember = existingMembers[0]
        await MembersService.updateMember(existingMember.id!, memberData)
        result = {
          success: true,
          entityType: 'members',
          entityId: existingMember.id,
          mondayItemId,
          action: 'updated'
        }
      } else {
        const newMember = await MembersService.createMember({
          ...memberData,
          monday_item_id: mondayItemId,
          status: memberData.status || 'active',
          email: memberData.email || `temp_${mondayItemId}@example.com`,
          primary_phone: memberData.primary_phone || '0000000000',
          first_name: memberData.first_name || memberData.name?.split(' ')[0] || 'Unknown',
          paternal_last_name: memberData.paternal_last_name || memberData.name?.split(' ')[1] || 'Unknown'
        } as Member)

        result = {
          success: true,
          entityType: 'members',
          entityId: newMember.id,
          mondayItemId,
          action: 'created'
        }
      }

      if (result.entityId) {
        await MembersService.updateSyncStatus(result.entityId, 'synced')
      }

      return result
    } catch (error) {
      return {
        success: false,
        entityType: 'members',
        mondayItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'skipped'
      }
    }
  }

  async syncPendingMembersToMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const pendingMembers = await MembersService.getMembersNeedingSync()

    for (const member of pendingMembers) {
      if (member.id) {
        const result = await this.syncMemberToMonday(member.id)
        results.push(result)
        await this.delay()
      }
    }

    const endTime = new Date()
    return {
      entityType: 'members',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  async fullSyncMembersFromMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const mondayMembers = await MondayMembersAPI.getAllMembersFromMonday()

    for (const mondayMember of mondayMembers) {
      const result = await this.syncMemberFromMonday(mondayMember.id)
      results.push(result)
      await this.delay()
    }

    const endTime = new Date()
    return {
      entityType: 'members',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  // ==================== CONTRACTS SYNC ====================

  async syncContractToMonday(contractId: string): Promise<SyncResult> {
    try {
      const contract = await ContractsService.getContract(contractId)

      if (!contract) {
        return {
          success: false,
          entityType: 'contracts',
          entityId: contractId,
          error: 'Contract not found',
          action: 'skipped'
        }
      }

      let result: SyncResult

      if (contract.monday_item_id) {
        try {
          await MondayContractsAPI.updateContractInMonday(contract.monday_item_id, contract)
          result = {
            success: true,
            entityType: 'contracts',
            entityId: contractId,
            mondayItemId: contract.monday_item_id,
            action: 'updated'
          }
        } catch (updateError) {
          const newMondayId = await MondayContractsAPI.createContractInMonday(contract)
          result = {
            success: true,
            entityType: 'contracts',
            entityId: contractId,
            mondayItemId: newMondayId,
            action: 'created'
          }
        }
      } else {
        const mondayItemId = await MondayContractsAPI.createContractInMonday(contract)
        result = {
          success: true,
          entityType: 'contracts',
          entityId: contractId,
          mondayItemId,
          action: 'created'
        }
      }

      await ContractsService.updateSyncStatus(contractId, 'synced', undefined, result.mondayItemId)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await ContractsService.updateSyncStatus(contractId, 'error', errorMessage)
      return {
        success: false,
        entityType: 'contracts',
        entityId: contractId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }

  async syncContractFromMonday(mondayItemId: string): Promise<SyncResult> {
    try {
      const mondayContract = await MondayContractsAPI.getContractFromMonday(mondayItemId)

      if (!mondayContract) {
        return {
          success: false,
          entityType: 'contracts',
          mondayItemId,
          error: 'Monday contract not found',
          action: 'skipped'
        }
      }

      const contractData = MondayContractsAPI.mondayToFirebaseContract(mondayContract)
      const existingContract = await ContractsService.searchByMondayId(mondayItemId)

      let result: SyncResult

      if (existingContract) {
        await ContractsService.updateContract(existingContract.id!, contractData)
        result = {
          success: true,
          entityType: 'contracts',
          entityId: existingContract.id,
          mondayItemId,
          action: 'updated'
        }
      } else {
        const newContract = await ContractsService.createContract({
          ...contractData,
          monday_item_id: mondayItemId,
          member_id: contractData.member_id || 'unknown',
          contract_type: contractData.contract_type || 'standard',
          start_date: contractData.start_date || new Date(),
          end_date: contractData.end_date || new Date(),
          monthly_fee: contractData.monthly_fee || 0,
          status: contractData.status || 'active'
        } as Contract)

        result = {
          success: true,
          entityType: 'contracts',
          entityId: newContract.id,
          mondayItemId,
          action: 'created'
        }
      }

      if (result.entityId) {
        await ContractsService.updateSyncStatus(result.entityId, 'synced')
      }

      return result
    } catch (error) {
      return {
        success: false,
        entityType: 'contracts',
        mondayItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'skipped'
      }
    }
  }

  async syncPendingContractsToMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const pendingContracts = await ContractsService.getContractsNeedingSync()

    for (const contract of pendingContracts) {
      if (contract.id) {
        const result = await this.syncContractToMonday(contract.id)
        results.push(result)
        await this.delay()
      }
    }

    const endTime = new Date()
    return {
      entityType: 'contracts',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  async fullSyncContractsFromMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const mondayContracts = await MondayContractsAPI.getAllContractsFromMonday()

    for (const mondayContract of mondayContracts) {
      const result = await this.syncContractFromMonday(mondayContract.id)
      results.push(result)
      await this.delay()
    }

    const endTime = new Date()
    return {
      entityType: 'contracts',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  // ==================== PAYMENTS SYNC ====================

  async syncPaymentToMonday(paymentId: string): Promise<SyncResult> {
    try {
      const payment = await PaymentsService.getPayment(paymentId)

      if (!payment) {
        return {
          success: false,
          entityType: 'payments',
          entityId: paymentId,
          error: 'Payment not found',
          action: 'skipped'
        }
      }

      let result: SyncResult

      if (payment.monday_item_id) {
        try {
          await MondayPaymentsAPI.updatePaymentInMonday(payment.monday_item_id, payment)
          result = {
            success: true,
            entityType: 'payments',
            entityId: paymentId,
            mondayItemId: payment.monday_item_id,
            action: 'updated'
          }
        } catch (updateError) {
          const newMondayId = await MondayPaymentsAPI.createPaymentInMonday(payment)
          result = {
            success: true,
            entityType: 'payments',
            entityId: paymentId,
            mondayItemId: newMondayId,
            action: 'created'
          }
        }
      } else {
        const mondayItemId = await MondayPaymentsAPI.createPaymentInMonday(payment)
        result = {
          success: true,
          entityType: 'payments',
          entityId: paymentId,
          mondayItemId,
          action: 'created'
        }
      }

      await PaymentsService.updateSyncStatus(paymentId, 'synced', undefined, result.mondayItemId)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await PaymentsService.updateSyncStatus(paymentId, 'error', errorMessage)
      return {
        success: false,
        entityType: 'payments',
        entityId: paymentId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }

  async syncPaymentFromMonday(mondayItemId: string): Promise<SyncResult> {
    try {
      const mondayPayment = await MondayPaymentsAPI.getPaymentFromMonday(mondayItemId)

      if (!mondayPayment) {
        return {
          success: false,
          entityType: 'payments',
          mondayItemId,
          error: 'Monday payment not found',
          action: 'skipped'
        }
      }

      const paymentData = MondayPaymentsAPI.mondayToFirebasePayment(mondayPayment)
      const existingPayment = await PaymentsService.searchByMondayId(mondayItemId)

      let result: SyncResult

      if (existingPayment) {
        await PaymentsService.updatePayment(existingPayment.id!, paymentData)
        result = {
          success: true,
          entityType: 'payments',
          entityId: existingPayment.id,
          mondayItemId,
          action: 'updated'
        }
      } else {
        const newPayment = await PaymentsService.createPayment({
          ...paymentData,
          monday_item_id: mondayItemId,
          member_id: paymentData.member_id || 'unknown',
          amount: paymentData.amount || 0,
          currency: paymentData.currency || 'MXN',
          payment_type: paymentData.payment_type || 'other',
          status: paymentData.status || 'pending',
          due_date: paymentData.due_date || new Date(),
          payment_method: paymentData.payment_method || 'cash'
        } as Payment)

        result = {
          success: true,
          entityType: 'payments',
          entityId: newPayment.id,
          mondayItemId,
          action: 'created'
        }
      }

      if (result.entityId) {
        await PaymentsService.updateSyncStatus(result.entityId, 'synced')
      }

      return result
    } catch (error) {
      return {
        success: false,
        entityType: 'payments',
        mondayItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'skipped'
      }
    }
  }

  async syncPendingPaymentsToMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const pendingPayments = await PaymentsService.getPaymentsNeedingSync()

    for (const payment of pendingPayments) {
      if (payment.id) {
        const result = await this.syncPaymentToMonday(payment.id)
        results.push(result)
        await this.delay()
      }
    }

    const endTime = new Date()
    return {
      entityType: 'payments',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  async fullSyncPaymentsFromMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const mondayPayments = await MondayPaymentsAPI.getAllPaymentsFromMonday()

    for (const mondayPayment of mondayPayments) {
      const result = await this.syncPaymentFromMonday(mondayPayment.id)
      results.push(result)
      await this.delay()
    }

    const endTime = new Date()
    return {
      entityType: 'payments',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  // ==================== EMPLOYEES SYNC ====================

  async syncEmployeeToMonday(employeeId: string): Promise<SyncResult> {
    try {
      const employee = await EmployeesService.getEmployee(employeeId)

      if (!employee) {
        return {
          success: false,
          entityType: 'employees',
          entityId: employeeId,
          error: 'Employee not found',
          action: 'skipped'
        }
      }

      let result: SyncResult

      if (employee.monday_item_id) {
        try {
          await MondayEmployeesAPI.updateEmployeeInMonday(employee.monday_item_id, employee)
          result = {
            success: true,
            entityType: 'employees',
            entityId: employeeId,
            mondayItemId: employee.monday_item_id,
            action: 'updated'
          }
        } catch (updateError) {
          const newMondayId = await MondayEmployeesAPI.createEmployeeInMonday(employee)
          result = {
            success: true,
            entityType: 'employees',
            entityId: employeeId,
            mondayItemId: newMondayId,
            action: 'created'
          }
        }
      } else {
        const mondayItemId = await MondayEmployeesAPI.createEmployeeInMonday(employee)
        result = {
          success: true,
          entityType: 'employees',
          entityId: employeeId,
          mondayItemId,
          action: 'created'
        }
      }

      await EmployeesService.updateSyncStatus(employeeId, 'synced', undefined, result.mondayItemId)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      await EmployeesService.updateSyncStatus(employeeId, 'error', errorMessage)
      return {
        success: false,
        entityType: 'employees',
        entityId: employeeId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }

  async syncEmployeeFromMonday(mondayItemId: string): Promise<SyncResult> {
    try {
      const mondayEmployee = await MondayEmployeesAPI.getEmployeeFromMonday(mondayItemId)

      if (!mondayEmployee) {
        return {
          success: false,
          entityType: 'employees',
          mondayItemId,
          error: 'Monday employee not found',
          action: 'skipped'
        }
      }

      const employeeData = MondayEmployeesAPI.mondayToFirebaseEmployee(mondayEmployee)
      const existingEmployee = await EmployeesService.searchByMondayId(mondayItemId)

      let result: SyncResult

      if (existingEmployee) {
        await EmployeesService.updateEmployee(existingEmployee.id!, employeeData)
        result = {
          success: true,
          entityType: 'employees',
          entityId: existingEmployee.id,
          mondayItemId,
          action: 'updated'
        }
      } else {
        const newEmployee = await EmployeesService.createEmployee({
          ...employeeData,
          monday_item_id: mondayItemId,
          first_name: employeeData.first_name || employeeData.name?.split(' ')[0] || 'Unknown',
          paternal_last_name: employeeData.paternal_last_name || employeeData.name?.split(' ')[1] || 'Unknown',
          email: employeeData.email || `emp_${mondayItemId}@example.com`,
          primary_phone: employeeData.primary_phone || '0000000000',
          position: employeeData.position || 'Staff',
          department: employeeData.department || 'General',
          status: employeeData.status || 'active',
          hire_date: employeeData.hire_date || new Date(),
          access_level: employeeData.access_level || 'limited'
        } as Employee)

        result = {
          success: true,
          entityType: 'employees',
          entityId: newEmployee.id,
          mondayItemId,
          action: 'created'
        }
      }

      if (result.entityId) {
        await EmployeesService.updateSyncStatus(result.entityId, 'synced')
      }

      return result
    } catch (error) {
      return {
        success: false,
        entityType: 'employees',
        mondayItemId,
        error: error instanceof Error ? error.message : 'Unknown error',
        action: 'skipped'
      }
    }
  }

  async syncPendingEmployeesToMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const pendingEmployees = await EmployeesService.getEmployeesNeedingSync()

    for (const employee of pendingEmployees) {
      if (employee.id) {
        const result = await this.syncEmployeeToMonday(employee.id)
        results.push(result)
        await this.delay()
      }
    }

    const endTime = new Date()
    return {
      entityType: 'employees',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  async fullSyncEmployeesFromMonday(): Promise<SyncReport> {
    const startTime = new Date()
    const results: SyncResult[] = []

    const mondayEmployees = await MondayEmployeesAPI.getAllEmployeesFromMonday()

    for (const mondayEmployee of mondayEmployees) {
      const result = await this.syncEmployeeFromMonday(mondayEmployee.id)
      results.push(result)
      await this.delay()
    }

    const endTime = new Date()
    return {
      entityType: 'employees',
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime()
    }
  }

  // ==================== MASTER SYNC OPERATIONS ====================

  // Sync a single entity type
  async syncEntityToMonday(entityType: EntityType): Promise<SyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    this.syncInProgress = true
    this.currentSyncEntity = entityType

    try {
      switch (entityType) {
        case 'members':
          return await this.syncPendingMembersToMonday()
        case 'contracts':
          return await this.syncPendingContractsToMonday()
        case 'payments':
          return await this.syncPendingPaymentsToMonday()
        case 'employees':
          return await this.syncPendingEmployeesToMonday()
      }
    } finally {
      this.syncInProgress = false
      this.currentSyncEntity = null
    }
  }

  async syncEntityFromMonday(entityType: EntityType): Promise<SyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    this.syncInProgress = true
    this.currentSyncEntity = entityType

    try {
      switch (entityType) {
        case 'members':
          return await this.fullSyncMembersFromMonday()
        case 'contracts':
          return await this.fullSyncContractsFromMonday()
        case 'payments':
          return await this.fullSyncPaymentsFromMonday()
        case 'employees':
          return await this.fullSyncEmployeesFromMonday()
      }
    } finally {
      this.syncInProgress = false
      this.currentSyncEntity = null
    }
  }

  // Full bidirectional sync for all entities
  async performFullBidirectionalSync(): Promise<FullSyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }

    this.syncInProgress = true
    const startTime = Date.now()

    try {
      // Sync all pending to Monday first
      const membersToMonday = await this.syncPendingMembersToMonday()
      const contractsToMonday = await this.syncPendingContractsToMonday()
      const paymentsToMonday = await this.syncPendingPaymentsToMonday()
      const employeesToMonday = await this.syncPendingEmployeesToMonday()

      // Then pull from Monday
      const membersFromMonday = await this.fullSyncMembersFromMonday()
      const contractsFromMonday = await this.fullSyncContractsFromMonday()
      const paymentsFromMonday = await this.fullSyncPaymentsFromMonday()
      const employeesFromMonday = await this.fullSyncEmployeesFromMonday()

      // Combine reports
      return {
        members: this.combineReports(membersToMonday, membersFromMonday),
        contracts: this.combineReports(contractsToMonday, contractsFromMonday),
        payments: this.combineReports(paymentsToMonday, paymentsFromMonday),
        employees: this.combineReports(employeesToMonday, employeesFromMonday),
        totalDuration: Date.now() - startTime
      }
    } finally {
      this.syncInProgress = false
      this.currentSyncEntity = null
    }
  }

  private combineReports(toMonday: SyncReport, fromMonday: SyncReport): SyncReport {
    return {
      entityType: toMonday.entityType,
      totalProcessed: toMonday.totalProcessed + fromMonday.totalProcessed,
      successful: toMonday.successful + fromMonday.successful,
      failed: toMonday.failed + fromMonday.failed,
      results: [...toMonday.results, ...fromMonday.results],
      startTime: toMonday.startTime,
      endTime: fromMonday.endTime,
      duration: toMonday.duration + fromMonday.duration
    }
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleMondayWebhook(data: {
    event: {
      type: string
      itemId: string
      boardId: string
      columnId?: string
      value?: unknown
    }
    entityType: EntityType
  }): Promise<SyncResult> {
    const { event, entityType } = data

    if (event.type === 'create_item' || event.type === 'change_column_value') {
      switch (entityType) {
        case 'members':
          return await this.syncMemberFromMonday(event.itemId)
        case 'contracts':
          return await this.syncContractFromMonday(event.itemId)
        case 'payments':
          return await this.syncPaymentFromMonday(event.itemId)
        case 'employees':
          return await this.syncEmployeeFromMonday(event.itemId)
      }
    } else if (event.type === 'delete_item' || event.type === 'archive_item') {
      // Mark as inactive in Firebase
      switch (entityType) {
        case 'members':
          const members = await MembersService.searchMembers({ monday_item_id: event.itemId })
          if (members.length > 0 && members[0].id) {
            await MembersService.updateMember(members[0].id, { status: 'inactive' })
          }
          break
        case 'contracts':
          const contract = await ContractsService.searchByMondayId(event.itemId)
          if (contract?.id) {
            await ContractsService.updateContract(contract.id, { status: 'inactive' })
          }
          break
        case 'payments':
          const payment = await PaymentsService.searchByMondayId(event.itemId)
          if (payment?.id) {
            await PaymentsService.updatePayment(payment.id, { status: 'cancelled' })
          }
          break
        case 'employees':
          const employee = await EmployeesService.searchByMondayId(event.itemId)
          if (employee?.id) {
            await EmployeesService.updateEmployee(employee.id, { status: 'inactive' })
          }
          break
      }

      return {
        success: true,
        entityType,
        mondayItemId: event.itemId,
        action: 'deleted'
      }
    }

    return {
      success: false,
      entityType,
      mondayItemId: event.itemId,
      error: 'Unknown event type',
      action: 'skipped'
    }
  }

  // ==================== STATUS & UTILITIES ====================

  isSyncInProgress(): boolean {
    return this.syncInProgress
  }

  getCurrentSyncEntity(): EntityType | null {
    return this.currentSyncEntity
  }

  async validateConnection(): Promise<boolean> {
    try {
      return await MondayMembersAPI.testConnection()
    } catch (error) {
      console.error('Monday connection validation failed:', error)
      return false
    }
  }

  async getSyncStats(): Promise<{
    members: { total: number; needingSync: number }
    contracts: { total: number; needingSync: number }
    payments: { total: number; needingSync: number }
    employees: { total: number; needingSync: number }
  }> {
    const [memberStats, contractStats, paymentStats, employeeStats] = await Promise.all([
      MembersService.getStats(),
      ContractsService.getStats(),
      PaymentsService.getStats(),
      EmployeesService.getStats()
    ])

    return {
      members: { total: memberStats.total, needingSync: memberStats.needingSync },
      contracts: { total: contractStats.total, needingSync: contractStats.needingSync },
      payments: { total: paymentStats.total, needingSync: paymentStats.needingSync },
      employees: { total: employeeStats.total, needingSync: employeeStats.needingSync }
    }
  }
}

export default MondaySyncManager.getInstance()
