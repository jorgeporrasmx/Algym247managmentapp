import { Payment } from '@/lib/firebase/payments-service'
import {
  MONDAY_API_URL,
  MONDAY_API_VERSION,
  getMondayApiToken,
  getMondayBoardIds
} from './config'

export interface MondayPayment {
  id: string
  name: string
  column_values: Array<{
    id: string
    text: string
    value: string | null
  }>
}

export interface MondayColumnMapping {
  firebase_field: keyof Payment
  monday_column_id: string
  type: 'text' | 'date' | 'status' | 'number' | 'dropdown' | 'connect_boards'
}

// Column mappings between Firebase and Monday for payments
export const PAYMENT_COLUMN_MAPPINGS: MondayColumnMapping[] = [
  { firebase_field: 'member_id', monday_column_id: 'connect_boards', type: 'connect_boards' },
  { firebase_field: 'contract_id', monday_column_id: 'connect_boards__1', type: 'connect_boards' },
  { firebase_field: 'amount', monday_column_id: 'numbers', type: 'number' },
  { firebase_field: 'payment_type', monday_column_id: 'dropdown', type: 'dropdown' },
  { firebase_field: 'status', monday_column_id: 'status', type: 'status' },
  { firebase_field: 'due_date', monday_column_id: 'date', type: 'date' },
  { firebase_field: 'paid_date', monday_column_id: 'date__1', type: 'date' },
  { firebase_field: 'payment_method', monday_column_id: 'dropdown__1', type: 'dropdown' },
  { firebase_field: 'payment_reference', monday_column_id: 'text', type: 'text' },
  { firebase_field: 'currency', monday_column_id: 'text__1', type: 'text' },
  { firebase_field: 'description', monday_column_id: 'text__2', type: 'text' },
]

export class MondayPaymentsAPI {
  private static instance: MondayPaymentsAPI
  private boardId: string

  constructor() {
    const boardIds = getMondayBoardIds()
    this.boardId = boardIds.payments
  }

  static getInstance(): MondayPaymentsAPI {
    if (!MondayPaymentsAPI.instance) {
      MondayPaymentsAPI.instance = new MondayPaymentsAPI()
    }
    return MondayPaymentsAPI.instance
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

  // Convert Firebase payment to Monday column values
  private paymentToColumnValues(payment: Payment): string {
    const columnValues: Record<string, unknown> = {}

    PAYMENT_COLUMN_MAPPINGS.forEach(mapping => {
      const value = payment[mapping.firebase_field]
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
        case 'connect_boards':
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

  // Create a new payment in Monday
  async createPaymentInMonday(payment: Payment): Promise<string> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_PAYMENTS_BOARD_ID is not configured')
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

      const itemName = `Payment - ${payment.payment_type} - $${payment.amount}`

      const variables = {
        boardId: this.boardId,
        itemName,
        columnValues: this.paymentToColumnValues(payment)
      }

      const result = await this.makeQuery(mutation, variables)
      return result.create_item.id
    } catch (error) {
      console.error('Error creating payment in Monday:', error)
      throw error
    }
  }

  // Update a payment in Monday
  async updatePaymentInMonday(mondayItemId: string, payment: Partial<Payment>): Promise<void> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_PAYMENTS_BOARD_ID is not configured')
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
        columnValues: this.paymentToColumnValues(payment as Payment)
      }

      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error updating payment in Monday:', error)
      throw error
    }
  }

  // Get a payment from Monday
  async getPaymentFromMonday(mondayItemId: string): Promise<MondayPayment | null> {
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
      console.error('Error getting payment from Monday:', error)
      throw error
    }
  }

  // Get all payments from Monday board
  async getAllPaymentsFromMonday(): Promise<MondayPayment[]> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_PAYMENTS_BOARD_ID is not configured')
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
      console.error('Error getting all payments from Monday:', error)
      throw error
    }
  }

  // Convert Monday payment to Firebase format
  mondayToFirebasePayment(mondayPayment: MondayPayment): Partial<Payment> {
    const payment: Partial<Payment> = {
      monday_item_id: mondayPayment.id
    }

    mondayPayment.column_values.forEach(column => {
      const mapping = PAYMENT_COLUMN_MAPPINGS.find(m => m.monday_column_id === column.id)
      if (!mapping) return

      const value = column.value ? JSON.parse(column.value) : column.text

      switch (mapping.type) {
        case 'text':
          if (column.text) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = column.text
          }
          break
        case 'date':
          if (value?.date) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = new Date(value.date)
          }
          break
        case 'status':
          if (value?.label) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = value.label.toLowerCase()
          }
          break
        case 'number':
          if (column.text) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = parseFloat(column.text)
          }
          break
        case 'dropdown':
          if (value?.labels?.[0]) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = value.labels[0]
          }
          break
        case 'connect_boards':
          if (value?.linkedPulseIds?.[0]?.linkedPulseId) {
            (payment as Record<string, unknown>)[mapping.firebase_field] = value.linkedPulseIds[0].linkedPulseId
          }
          break
      }
    })

    return payment
  }

  // Test connection
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

  // Get board structure
  async getBoardStructure() {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_PAYMENTS_BOARD_ID is not configured')
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

export default MondayPaymentsAPI.getInstance()
