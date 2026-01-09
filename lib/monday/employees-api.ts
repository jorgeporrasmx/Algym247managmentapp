import { Employee } from '@/lib/firebase/employees-service'
import {
  MONDAY_API_URL,
  MONDAY_API_VERSION,
  getMondayApiToken,
  getMondayBoardIds
} from './config'

export interface MondayEmployee {
  id: string
  name: string
  column_values: Array<{
    id: string
    text: string
    value: string | null
  }>
}

export interface MondayColumnMapping {
  firebase_field: keyof Employee
  monday_column_id: string
  type: 'text' | 'email' | 'phone' | 'date' | 'status' | 'number' | 'dropdown'
}

// Column mappings between Firebase and Monday for employees
export const EMPLOYEE_COLUMN_MAPPINGS: MondayColumnMapping[] = [
  { firebase_field: 'first_name', monday_column_id: 'text', type: 'text' },
  { firebase_field: 'paternal_last_name', monday_column_id: 'text__1', type: 'text' },
  { firebase_field: 'maternal_last_name', monday_column_id: 'text__2', type: 'text' },
  { firebase_field: 'email', monday_column_id: 'email', type: 'email' },
  { firebase_field: 'primary_phone', monday_column_id: 'phone', type: 'phone' },
  { firebase_field: 'secondary_phone', monday_column_id: 'phone__1', type: 'phone' },
  { firebase_field: 'position', monday_column_id: 'dropdown', type: 'dropdown' },
  { firebase_field: 'department', monday_column_id: 'dropdown__1', type: 'dropdown' },
  { firebase_field: 'status', monday_column_id: 'status', type: 'status' },
  { firebase_field: 'hire_date', monday_column_id: 'date', type: 'date' },
  { firebase_field: 'date_of_birth', monday_column_id: 'date__1', type: 'date' },
  { firebase_field: 'access_level', monday_column_id: 'dropdown__2', type: 'dropdown' },
  { firebase_field: 'salary', monday_column_id: 'numbers', type: 'number' },
  { firebase_field: 'employee_id', monday_column_id: 'text__3', type: 'text' },
  { firebase_field: 'city', monday_column_id: 'text__4', type: 'text' },
  { firebase_field: 'state', monday_column_id: 'text__5', type: 'text' },
]

export class MondayEmployeesAPI {
  private static instance: MondayEmployeesAPI
  private boardId: string

  constructor() {
    const boardIds = getMondayBoardIds()
    this.boardId = boardIds.employees
  }

  static getInstance(): MondayEmployeesAPI {
    if (!MondayEmployeesAPI.instance) {
      MondayEmployeesAPI.instance = new MondayEmployeesAPI()
    }
    return MondayEmployeesAPI.instance
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

  // Convert Firebase employee to Monday column values
  private employeeToColumnValues(employee: Employee): string {
    const columnValues: Record<string, unknown> = {}

    EMPLOYEE_COLUMN_MAPPINGS.forEach(mapping => {
      const value = employee[mapping.firebase_field]
      if (value === undefined || value === null) return

      switch (mapping.type) {
        case 'text':
          columnValues[mapping.monday_column_id] = String(value)
          break
        case 'email':
          columnValues[mapping.monday_column_id] = {
            email: String(value),
            text: String(value)
          }
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
      }
    })

    return JSON.stringify(columnValues)
  }

  // Create a new employee in Monday
  async createEmployeeInMonday(employee: Employee): Promise<string> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_EMPLOYEES_BOARD_ID is not configured')
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

      const itemName = employee.name || `${employee.first_name} ${employee.paternal_last_name}`

      const variables = {
        boardId: this.boardId,
        itemName,
        columnValues: this.employeeToColumnValues(employee)
      }

      const result = await this.makeQuery(mutation, variables)
      return result.create_item.id
    } catch (error) {
      console.error('Error creating employee in Monday:', error)
      throw error
    }
  }

  // Update an employee in Monday
  async updateEmployeeInMonday(mondayItemId: string, employee: Partial<Employee>): Promise<void> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_EMPLOYEES_BOARD_ID is not configured')
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
        columnValues: this.employeeToColumnValues(employee as Employee)
      }

      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error updating employee in Monday:', error)
      throw error
    }
  }

  // Archive an employee in Monday
  async archiveEmployeeInMonday(mondayItemId: string): Promise<void> {
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
      console.error('Error archiving employee in Monday:', error)
      throw error
    }
  }

  // Get an employee from Monday
  async getEmployeeFromMonday(mondayItemId: string): Promise<MondayEmployee | null> {
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
      console.error('Error getting employee from Monday:', error)
      throw error
    }
  }

  // Get all employees from Monday board
  async getAllEmployeesFromMonday(): Promise<MondayEmployee[]> {
    try {
      if (!this.boardId) {
        throw new Error('MONDAY_EMPLOYEES_BOARD_ID is not configured')
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
      console.error('Error getting all employees from Monday:', error)
      throw error
    }
  }

  // Convert Monday employee to Firebase format
  mondayToFirebaseEmployee(mondayEmployee: MondayEmployee): Partial<Employee> {
    const employee: Partial<Employee> = {
      monday_item_id: mondayEmployee.id,
      name: mondayEmployee.name
    }

    mondayEmployee.column_values.forEach(column => {
      const mapping = EMPLOYEE_COLUMN_MAPPINGS.find(m => m.monday_column_id === column.id)
      if (!mapping) return

      const value = column.value ? JSON.parse(column.value) : column.text

      switch (mapping.type) {
        case 'text':
          if (column.text) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = column.text
          }
          break
        case 'email':
          if (value?.email) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = value.email
          }
          break
        case 'phone':
          if (value?.phone) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = value.phone
          }
          break
        case 'date':
          if (value?.date) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = new Date(value.date)
          }
          break
        case 'status':
          if (value?.label) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = value.label.toLowerCase()
          }
          break
        case 'number':
          if (column.text) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = parseFloat(column.text)
          }
          break
        case 'dropdown':
          if (value?.labels?.[0]) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = value.labels[0]
          }
          break
      }
    })

    return employee
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
        throw new Error('MONDAY_EMPLOYEES_BOARD_ID is not configured')
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

export default MondayEmployeesAPI.getInstance()
