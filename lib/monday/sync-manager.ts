import MembersService, { Member } from '@/lib/firebase/members-service'
import MondayMembersAPI from './members-api'

export interface SyncResult {
  success: boolean
  memberId?: string
  mondayItemId?: string
  error?: string
  action: 'created' | 'updated' | 'deleted' | 'skipped'
}

export interface SyncReport {
  totalProcessed: number
  successful: number
  failed: number
  results: SyncResult[]
  startTime: Date
  endTime: Date
  duration: number
}

export class MondaySyncManager {
  private static instance: MondaySyncManager
  private membersService: typeof MembersService
  private mondayAPI: typeof MondayMembersAPI
  private syncInProgress: boolean = false
  
  constructor() {
    this.membersService = MembersService
    this.mondayAPI = MondayMembersAPI
  }
  
  static getInstance(): MondaySyncManager {
    if (!MondaySyncManager.instance) {
      MondaySyncManager.instance = new MondaySyncManager()
    }
    return MondaySyncManager.instance
  }
  
  // Sync a single member from Firebase to Monday
  async syncMemberToMonday(memberId: string): Promise<SyncResult> {
    try {
      const member = await this.membersService.getMember(memberId)
      
      if (!member) {
        return {
          success: false,
          memberId,
          error: 'Member not found',
          action: 'skipped'
        }
      }
      
      let result: SyncResult
      
      if (member.monday_item_id) {
        // Update existing Monday item
        try {
          await this.mondayAPI.updateMemberInMonday(member.monday_item_id, member)
          result = {
            success: true,
            memberId,
            mondayItemId: member.monday_item_id,
            action: 'updated'
          }
        } catch (updateError) {
          // If update fails, try creating a new item
          console.log('Update failed, trying to create new item:', updateError)
          const newMondayId = await this.mondayAPI.createMemberInMonday(member)
          await this.membersService.updateSyncStatus(memberId, 'synced', undefined, newMondayId)
          result = {
            success: true,
            memberId,
            mondayItemId: newMondayId,
            action: 'created'
          }
        }
      } else {
        // Create new Monday item
        const mondayItemId = await this.mondayAPI.createMemberInMonday(member)
        await this.membersService.updateSyncStatus(memberId, 'synced', undefined, mondayItemId)
        result = {
          success: true,
          memberId,
          mondayItemId,
          action: 'created'
        }
      }
      
      // Update sync status
      await this.membersService.updateSyncStatus(
        memberId, 
        'synced',
        undefined,
        result.mondayItemId
      )
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update sync status with error
      await this.membersService.updateSyncStatus(memberId, 'error', errorMessage)
      
      return {
        success: false,
        memberId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }
  
  // Sync a member from Monday to Firebase
  async syncMemberFromMonday(mondayItemId: string): Promise<SyncResult> {
    try {
      const mondayMember = await this.mondayAPI.getMemberFromMonday(mondayItemId)
      
      if (!mondayMember) {
        return {
          success: false,
          mondayItemId,
          error: 'Monday member not found',
          action: 'skipped'
        }
      }
      
      // Convert Monday member to Firebase format
      const memberData = this.mondayAPI.mondayToFirebaseMember(mondayMember)
      
      // Check if member already exists in Firebase
      const existingMembers = await this.membersService.searchMembers({
        monday_item_id: mondayItemId
      })
      
      let result: SyncResult
      
      if (existingMembers.length > 0) {
        // Update existing member
        const existingMember = existingMembers[0]
        await this.membersService.updateMember(existingMember.id!, memberData)
        result = {
          success: true,
          memberId: existingMember.id,
          mondayItemId,
          action: 'updated'
        }
      } else {
        // Create new member
        const newMember = await this.membersService.createMember({
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
          memberId: newMember.id,
          mondayItemId,
          action: 'created'
        }
      }
      
      // Update sync status
      if (result.memberId) {
        await this.membersService.updateSyncStatus(result.memberId, 'synced')
      }
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        mondayItemId,
        error: errorMessage,
        action: 'skipped'
      }
    }
  }
  
  // Sync all pending members from Firebase to Monday
  async syncPendingToMonday(): Promise<SyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }
    
    this.syncInProgress = true
    const startTime = new Date()
    const results: SyncResult[] = []
    
    try {
      const pendingMembers = await this.membersService.getMembersNeedingSync()
      
      for (const member of pendingMembers) {
        if (member.id) {
          const result = await this.syncMemberToMonday(member.id)
          results.push(result)
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        }
      }
      
      const endTime = new Date()
      const report: SyncReport = {
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      }
      
      return report
    } finally {
      this.syncInProgress = false
    }
  }
  
  // Full sync from Monday to Firebase
  async fullSyncFromMonday(): Promise<SyncReport> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress')
    }
    
    this.syncInProgress = true
    const startTime = new Date()
    const results: SyncResult[] = []
    
    try {
      const mondayMembers = await this.mondayAPI.getAllMembersFromMonday()
      
      for (const mondayMember of mondayMembers) {
        const result = await this.syncMemberFromMonday(mondayMember.id)
        results.push(result)
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      const endTime = new Date()
      const report: SyncReport = {
        totalProcessed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime()
      }
      
      return report
    } finally {
      this.syncInProgress = false
    }
  }
  
  // Bidirectional sync (smart sync)
  async performBidirectionalSync(): Promise<{
    toMonday: SyncReport
    fromMonday: SyncReport
  }> {
    // First, sync pending changes from Firebase to Monday
    const toMondayReport = await this.syncPendingToMonday()
    
    // Then, pull any changes from Monday to Firebase
    const fromMondayReport = await this.fullSyncFromMonday()
    
    return {
      toMonday: toMondayReport,
      fromMonday: fromMondayReport
    }
  }
  
  // Check sync status
  isSyncInProgress(): boolean {
    return this.syncInProgress
  }
  
  // Handle webhook from Monday (when a member is updated in Monday)
  async handleMondayWebhook(data: {
    event: {
      type: string
      itemId: string
      boardId: string
      columnId?: string
      value?: unknown
    }
  }): Promise<void> {
    const { event } = data
    
    if (event.type === 'create_item' || event.type === 'change_column_value') {
      // Sync the updated/created item from Monday to Firebase
      await this.syncMemberFromMonday(event.itemId)
    } else if (event.type === 'delete_item' || event.type === 'archive_item') {
      // Mark member as inactive in Firebase
      const members = await this.membersService.searchMembers({
        monday_item_id: event.itemId
      })
      
      if (members.length > 0 && members[0].id) {
        await this.membersService.updateMember(members[0].id, {
          status: 'inactive'
        })
      }
    }
  }
  
  // Validate Monday connection
  async validateConnection(): Promise<boolean> {
    try {
      return await this.mondayAPI.testConnection()
    } catch (error) {
      console.error('Monday connection validation failed:', error)
      return false
    }
  }
}

export default MondaySyncManager.getInstance()