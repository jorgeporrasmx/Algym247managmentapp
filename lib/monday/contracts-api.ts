import { Contract } from '@/lib/firebase/contracts-service'
import {
  MONDAY_API_URL,
  MONDAY_API_VERSION,
  getMondayApiToken,
  getMondayBoardIds,
  COLUMN_MAPPINGS
} from './config'

export interface MondayContract {
  id: string
  name: string
  column_values: Array<{
    id: string
    text: string
    value: string | null
  }>
}

export interface MondayColumnMapping {
  firebase_field: keyof Contract
  monday_column_id: string
  type: 'text' | 'date' | 'status' | 'number' | 'dropdown' | 'checkbox' | 'connect_boards'
}

// Column mappings between Firebase and Monday for contracts
export const CONTRACT_COLUMN_MAPPINGS: MondayColumnMapping[] = [
  { firebase_field: 'contract_type', monday_column_id: 'dropdown', type: 'dropdown' },
  { firebase_field: 'start_date', monday_column_id: 'date', type: 'date' },
  { firebase_field: 'end_date', monday_column_id: 'date__1', type: 'date' },
  { firebase_field: 'monthly_fee', monday_column_id: 'numbers', type: 'number' },
  { firebase_field: 'status', monday_column_id: 'status', type: 'status' },
  { firebase_field: 'payment_method', monday_column_id: 'dropdown__1', type: 'dropdown' },
  { firebase_field: 'auto_renewal', monday_column_id: 'checkbox', type: 'checkbox' },
  { firebase_field: 'member_id', monday_column_id: 'connect_boards', type: 'connect_boards' },
  { firebase_field: 'notes', monday_column_id: 'text', type: 'text' },
]

export class MondayContractsAPI {
  private static instance: MondayContractsAPI
  private boardId: string

  constructor() {
    const boardIds = getMondayBoardIds()
    this.boardId = boardIds.contracts
  }

  static getInstance(): MondayContractsAPI {
    if (!MondayContractsAPI.instance) {
      MondayContractsAPI.instance = new MondayContractsAPI()
    }
    return MondayContractsAPI.instance
  }

  private async makeQuery(query: string, variables?: Record<string, unknown>) {
    try {
      const token = getMondayApiToken()

      const response = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'API-Version': MONDAY_API_VERSION
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

  // Convert Firebase contract to Monday column values
  private contractToColumnValues(contract: Contract): string {
    const columnValues: Record<string, unknown> = {}

    CONTRACT_COLUMN_MAPPINGS.forEach(mapping => {
      const value = contract[mapping.firebase_field]
      if (value === undefined || value === null) return

      switch (mapping.type) {
        case 'text':
          columnValues[mapping.monday_column_id] = String(value)
          break
        case 'date':
          if (value instanceof Date) {
            columnValues[mapping.monday_column_id] = {
              date: value.toISOString().split('T')[0]
            }
          } else if (typeof value === 'object' && 'toDate' in value) {
            // Firestore Timestamp
            columnValues[mapping.monday_column_id] = {
              date: (value as { toDate: () => Date }).toDate().toISOString().split('T')[0]
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
        case 'checkbox':
          columnValues[mapping.monday_column_id] = {
            checked: value === true || value === 'true' ? 'true' : 'false'
          }
          break
        case 'connect_boards':
          // Link to member item in Monday
          if (value) {
            columnValues[mapping.monday_column_id] = {
              item_ids: [String(value)]
            }
          }
          break
      }
    })

    return JSON.stringify(columnValues)
  }

  // Create a new contract in Monday
  async createContractInMonday(contract: Contract): Promise<string> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_CONTRACTS_BOARD_ID is not configured')
      }

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

      const itemName = `Contract - ${contract.contract_type}`

      const variables = {
        boardId: this.boardId,
        itemName,
        columnValues: this.contractToColumnValues(contract)
      }

      const result = await this.makeQuery(mutation, variables)
      return result.create_item.id
    } catch (error) {
      console.error('Error creating contract in Monday:', error)
      throw error
    }
  }

  // Update a contract in Monday
  async updateContractInMonday(mondayItemId: string, contract: Partial<Contract>): Promise<void> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_CONTRACTS_BOARD_ID is not configured')
      }

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
        boardId: this.boardId,
        itemId: mondayItemId,
        columnValues: this.contractToColumnValues(contract as Contract)
      }

      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error updating contract in Monday:', error)
      throw error
    }
  }

  // Archive a contract in Monday
  async archiveContractInMonday(mondayItemId: string): Promise<void> {
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
      console.error('Error archiving contract in Monday:', error)
      throw error
    }
  }

  // Get a contract from Monday
  async getContractFromMonday(mondayItemId: string): Promise<MondayContract | null> {
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
      console.error('Error getting contract from Monday:', error)
      throw error
    }
  }

  // Get all contracts from Monday board
  async getAllContractsFromMonday(): Promise<MondayContract[]> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_CONTRACTS_BOARD_ID is not configured')
      }

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
        boardId: this.boardId
      }

      const result = await this.makeQuery(query, variables)
      return result.boards[0]?.items_page?.items || []
    } catch (error) {
      console.error('Error getting all contracts from Monday:', error)
      throw error
    }
  }

  // Convert Monday contract to Firebase format
  mondayToFirebaseContract(mondayContract: MondayContract): Partial<Contract> {
    const contract: Partial<Contract> = {
      monday_item_id: mondayContract.id
    }

    // Map column values
    mondayContract.column_values.forEach(column => {
      const mapping = CONTRACT_COLUMN_MAPPINGS.find(m => m.monday_column_id === column.id)
      if (!mapping) return

      const value = column.value ? JSON.parse(column.value) : column.text

      switch (mapping.type) {
        case 'text':
          if (column.text) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = column.text
          }
          break
        case 'date':
          if (value?.date) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = new Date(value.date)
          }
          break
        case 'status':
          if (value?.label) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = value.label.toLowerCase()
          }
          break
        case 'number':
          if (column.text) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = parseFloat(column.text)
          }
          break
        case 'dropdown':
          if (value?.labels?.[0]) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = value.labels[0]
          }
          break
        case 'checkbox':
          (contract as Record<string, unknown>)[mapping.firebase_field] = value?.checked === 'true'
          break
        case 'connect_boards':
          if (value?.linkedPulseIds?.[0]?.linkedPulseId) {
            (contract as Record<string, unknown>)[mapping.firebase_field] = value.linkedPulseIds[0].linkedPulseId
          }
          break
      }
    })

    return contract
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
      if (!this.boardId) {
        throw new Error('MONDAY_CONTRACTS_BOARD_ID is not configured')
      }

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
        boardId: this.boardId
      }

      return await this.makeQuery(query, variables)
    } catch (error) {
      console.error('Error getting board structure:', error)
      throw error
    }
  }
}

export default MondayContractsAPI.getInstance()
