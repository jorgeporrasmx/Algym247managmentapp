import { Member } from '@/lib/firebase/members-service'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN || ''
const MEMBERS_BOARD_ID = process.env.MONDAY_MEMBERS_BOARD_ID || ''

export interface MondayMember {
  id: string
  name: string
  column_values: Array<{
    id: string
    text: string
    value: string | null
  }>
}

export interface MondayColumnMapping {
  firebase_field: keyof Member
  monday_column_id: string
  type: 'text' | 'email' | 'phone' | 'date' | 'status' | 'number' | 'dropdown'
}

// Column mappings between Firebase and Monday
export const COLUMN_MAPPINGS: MondayColumnMapping[] = [
  { firebase_field: 'first_name', monday_column_id: 'text', type: 'text' },
  { firebase_field: 'paternal_last_name', monday_column_id: 'text__1', type: 'text' },
  { firebase_field: 'maternal_last_name', monday_column_id: 'text__2', type: 'text' },
  { firebase_field: 'email', monday_column_id: 'email', type: 'email' },
  { firebase_field: 'primary_phone', monday_column_id: 'phone', type: 'phone' },
  { firebase_field: 'secondary_phone', monday_column_id: 'phone__1', type: 'phone' },
  { firebase_field: 'date_of_birth', monday_column_id: 'date', type: 'date' },
  { firebase_field: 'status', monday_column_id: 'status', type: 'status' },
  { firebase_field: 'selected_plan', monday_column_id: 'dropdown', type: 'dropdown' },
  { firebase_field: 'monthly_amount', monday_column_id: 'numbers', type: 'number' },
  { firebase_field: 'start_date', monday_column_id: 'date__1', type: 'date' },
  { firebase_field: 'expiration_date', monday_column_id: 'date__2', type: 'date' },
  { firebase_field: 'city', monday_column_id: 'text__3', type: 'text' },
  { firebase_field: 'state', monday_column_id: 'text__4', type: 'text' },
  { firebase_field: 'employee', monday_column_id: 'text__5', type: 'text' },
  { firebase_field: 'direct_debit', monday_column_id: 'dropdown__1', type: 'dropdown' },
]

export class MondayMembersAPI {
  private static instance: MondayMembersAPI
  
  static getInstance(): MondayMembersAPI {
    if (!MondayMembersAPI.instance) {
      MondayMembersAPI.instance = new MondayMembersAPI()
    }
    return MondayMembersAPI.instance
  }
  
  private async makeQuery(query: string, variables?: Record<string, unknown>) {
    try {
      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
          'API-Version': '2023-10'
        },
        body: JSON.stringify({
          query,
          variables
        })
      })
      
      if (!response.ok) {
        throw new Error(`Monday API error: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.errors) {
        console.error('Monday API errors:', data.errors)
        throw new Error(`Monday API error: ${data.errors[0]?.message}`)
      }
      
      return data.data
    } catch (error) {
      console.error('Error making Monday API request:', error)
      throw error
    }
  }
  
  // Convert Firebase member to Monday column values
  private memberToColumnValues(member: Member): string {
    // Monday column values can be strings or various object types depending on column type
    const columnValues: Record<string, unknown> = {}
    
    COLUMN_MAPPINGS.forEach(mapping => {
      const value = member[mapping.firebase_field]
      if (value === undefined || value === null) return
      
      switch (mapping.type) {
        case 'text':
        case 'email':
          columnValues[mapping.monday_column_id] = String(value)
          break
        case 'phone':
          columnValues[mapping.monday_column_id] = {
            phone: String(value),
            countryShortName: 'MX'
          }
          break
        case 'date':
          if (value instanceof Date) {
            columnValues[mapping.monday_column_id] = {
              date: value.toISOString().split('T')[0]
            }
          } else if (typeof value === 'object' && 'toDate' in value) {
            // Firestore Timestamp
            columnValues[mapping.monday_column_id] = {
              date: value.toDate().toISOString().split('T')[0]
            }
          }
          break
        case 'status':
          columnValues[mapping.monday_column_id] = {
            label: String(value)
          }
          break
        case 'number':
          columnValues[mapping.monday_column_id] = Number(value)
          break
        case 'dropdown':
          columnValues[mapping.monday_column_id] = {
            labels: [String(value)]
          }
          break
      }
    })
    
    return JSON.stringify(columnValues)
  }
  
  // Create a new member in Monday
  async createMemberInMonday(member: Member): Promise<string> {
    try {
      const mutation = `
        mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
          create_item (
            board_id: $boardId
            item_name: $itemName
            column_values: $columnValues
          ) {
            id
          }
        }
      `
      
      const variables = {
        boardId: MEMBERS_BOARD_ID,
        itemName: member.name || `${member.first_name} ${member.paternal_last_name}`,
        columnValues: this.memberToColumnValues(member)
      }
      
      const result = await this.makeQuery(mutation, variables)
      return result.create_item.id
    } catch (error) {
      console.error('Error creating member in Monday:', error)
      throw error
    }
  }
  
  // Update a member in Monday
  async updateMemberInMonday(mondayItemId: string, member: Partial<Member>): Promise<void> {
    try {
      const mutation = `
        mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values (
            board_id: $boardId
            item_id: $itemId
            column_values: $columnValues
          ) {
            id
          }
        }
      `
      
      const variables = {
        boardId: MEMBERS_BOARD_ID,
        itemId: mondayItemId,
        columnValues: this.memberToColumnValues(member as Member)
      }
      
      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error updating member in Monday:', error)
      throw error
    }
  }
  
  // Delete (archive) a member in Monday
  async archiveMemberInMonday(mondayItemId: string): Promise<void> {
    try {
      const mutation = `
        mutation ($itemId: ID!) {
          archive_item (item_id: $itemId) {
            id
          }
        }
      `
      
      const variables = {
        itemId: mondayItemId
      }
      
      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error archiving member in Monday:', error)
      throw error
    }
  }
  
  // Get a member from Monday
  async getMemberFromMonday(mondayItemId: string): Promise<MondayMember | null> {
    try {
      const query = `
        query ($itemId: ID!) {
          items (ids: [$itemId]) {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      `
      
      const variables = {
        itemId: mondayItemId
      }
      
      const result = await this.makeQuery(query, variables)
      return result.items[0] || null
    } catch (error) {
      console.error('Error getting member from Monday:', error)
      throw error
    }
  }
  
  // Get all members from Monday board
  async getAllMembersFromMonday(): Promise<MondayMember[]> {
    try {
      const query = `
        query ($boardId: ID!) {
          boards(ids: [$boardId]) {
            items_page {
              items {
                id
                name
                column_values {
                  id
                  text
                  value
                }
              }
            }
          }
        }
      `
      
      const variables = {
        boardId: MEMBERS_BOARD_ID
      }
      
      const result = await this.makeQuery(query, variables)
      return result.boards[0]?.items_page?.items || []
    } catch (error) {
      console.error('Error getting all members from Monday:', error)
      throw error
    }
  }
  
  // Convert Monday member to Firebase format
  mondayToFirebaseMember(mondayMember: MondayMember): Partial<Member> {
    const member: Partial<Member> = {
      monday_item_id: mondayMember.id,
      name: mondayMember.name
    }
    
    // Map column values
    mondayMember.column_values.forEach(column => {
      const mapping = COLUMN_MAPPINGS.find(m => m.monday_column_id === column.id)
      if (!mapping) return
      
      const value = column.value ? JSON.parse(column.value) : column.text
      
      const memberAny = member as Record<string, unknown>
      switch (mapping.type) {
        case 'text':
        case 'email':
          if (column.text) {
            memberAny[mapping.firebase_field] = column.text
          }
          break
        case 'phone':
          if (value?.phone) {
            memberAny[mapping.firebase_field] = value.phone
          }
          break
        case 'date':
          if (value?.date) {
            memberAny[mapping.firebase_field] = new Date(value.date)
          }
          break
        case 'status':
          if (value?.label) {
            memberAny[mapping.firebase_field] = value.label.toLowerCase()
          }
          break
        case 'number':
          if (column.text) {
            memberAny[mapping.firebase_field] = parseFloat(column.text)
          }
          break
        case 'dropdown':
          if (value?.labels?.[0]) {
            memberAny[mapping.firebase_field] = value.labels[0]
          }
          break
      }
    })
    
    return member
  }
  
  // Test connection to Monday
  async testConnection(): Promise<boolean> {
    try {
      const query = `
        query {
          me {
            id
            name
          }
        }
      `
      
      const result = await this.makeQuery(query)
      console.log('Monday API connected as:', result.me.name)
      return true
    } catch (error) {
      console.error('Monday API connection failed:', error)
      return false
    }
  }
  
  // Get board structure (for debugging/setup)
  async getBoardStructure() {
    try {
      const query = `
        query ($boardId: ID!) {
          boards(ids: [$boardId]) {
            id
            name
            description
            columns {
              id
              title
              type
              settings_str
            }
          }
        }
      `
      
      const variables = {
        boardId: MEMBERS_BOARD_ID
      }
      
      return await this.makeQuery(query, variables)
    } catch (error) {
      console.error('Error getting board structure:', error)
      throw error
    }
  }
}

export default MondayMembersAPI.getInstance()