import { Employee } from '@/lib/firebase/employees-service'
import { AccessLevel, getAccessLevelFromString } from '@/lib/permissions'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_API_TOKEN = process.env.MONDAY_API_KEY || ''
const EMPLOYEES_BOARD_ID = process.env.MONDAY_EMPLOYEES_BOARD_ID || ''

export interface MondayEmployee {
  id: string
  name: string
  column_values: Array<{
    id: string
    text: string
    value: any
  }>
}

export interface MondayColumnMapping {
  firebase_field: keyof Employee
  monday_column_id: string
  type: 'text' | 'email' | 'phone' | 'date' | 'status' | 'number' | 'dropdown'
}

// Column mappings between Firebase and Monday
// IMPORTANT: These column IDs need to be configured based on your Monday.com board structure
export const EMPLOYEE_COLUMN_MAPPINGS: MondayColumnMapping[] = [
  { firebase_field: 'first_name', monday_column_id: 'text', type: 'text' },
  { firebase_field: 'paternal_last_name', monday_column_id: 'text__1', type: 'text' },
  { firebase_field: 'maternal_last_name', monday_column_id: 'text__2', type: 'text' },
  { firebase_field: 'email', monday_column_id: 'email', type: 'email' },
  { firebase_field: 'primary_phone', monday_column_id: 'phone', type: 'phone' },
  { firebase_field: 'secondary_phone', monday_column_id: 'phone__1', type: 'phone' },
  { firebase_field: 'date_of_birth', monday_column_id: 'date', type: 'date' },
  { firebase_field: 'hire_date', monday_column_id: 'date__1', type: 'date' },
  { firebase_field: 'status', monday_column_id: 'status', type: 'status' },
  { firebase_field: 'position', monday_column_id: 'text__3', type: 'text' },
  { firebase_field: 'department', monday_column_id: 'dropdown', type: 'dropdown' },
  { firebase_field: 'access_level', monday_column_id: 'dropdown__1', type: 'dropdown' },
  { firebase_field: 'salary', monday_column_id: 'numbers', type: 'number' },
  { firebase_field: 'employee_id', monday_column_id: 'text__4', type: 'text' },
  { firebase_field: 'city', monday_column_id: 'text__5', type: 'text' },
  { firebase_field: 'state', monday_column_id: 'text__6', type: 'text' },
  { firebase_field: 'work_schedule', monday_column_id: 'text__7', type: 'text' },
  { firebase_field: 'manager', monday_column_id: 'text__8', type: 'text' },
]

export class MondayEmployeesAPI {
  private static instance: MondayEmployeesAPI

  static getInstance(): MondayEmployeesAPI {
    if (!MondayEmployeesAPI.instance) {
      MondayEmployeesAPI.instance = new MondayEmployeesAPI()
    }
    return MondayEmployeesAPI.instance
  }

  private async makeQuery(query: string, variables?: Record<string, unknown>) {
    try {
      if (!MONDAY_API_TOKEN) {
        throw new Error('Monday API token is not configured')
      }

      if (!EMPLOYEES_BOARD_ID) {
        throw new Error('Monday Employees Board ID is not configured')
      }

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

  // Convert Firebase employee to Monday column values
  private employeeToColumnValues(employee: Employee): string {
    const columnValues: Record<string, unknown> = {}

    EMPLOYEE_COLUMN_MAPPINGS.forEach(mapping => {
      const value = employee[mapping.firebase_field]
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
        boardId: EMPLOYEES_BOARD_ID,
        itemName: employee.name || `${employee.first_name} ${employee.paternal_last_name}`,
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
        boardId: EMPLOYEES_BOARD_ID,
        itemId: mondayItemId,
        columnValues: this.employeeToColumnValues(employee as Employee)
      }

      await this.makeQuery(mutation, variables)
    } catch (error) {
      console.error('Error updating employee in Monday:', error)
      throw error
    }
  }

  // Delete (archive) an employee in Monday
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
        boardId: EMPLOYEES_BOARD_ID
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

    // Map column values
    mondayEmployee.column_values.forEach(column => {
      const mapping = EMPLOYEE_COLUMN_MAPPINGS.find(m => m.monday_column_id === column.id)
      if (!mapping) return

      const value = column.value ? JSON.parse(column.value) : column.text

      switch (mapping.type) {
        case 'text':
        case 'email':
          if (column.text) {
            (employee as Record<string, unknown>)[mapping.firebase_field] = column.text
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
            // Special handling for access_level
            if (mapping.firebase_field === 'access_level') {
              (employee as Record<string, unknown>)[mapping.firebase_field] = getAccessLevelFromString(value.labels[0])
            } else {
              (employee as Record<string, unknown>)[mapping.firebase_field] = value.labels[0]
            }
          }
          break
      }
    })

    return employee
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
        boardId: EMPLOYEES_BOARD_ID
      }

      return await this.makeQuery(query, variables)
    } catch (error) {
      console.error('Error getting board structure:', error)
      throw error
    }
  }

  // Check if Monday integration is configured
  isConfigured(): boolean {
    return !!(MONDAY_API_TOKEN && EMPLOYEES_BOARD_ID)
  }
}

export default MondayEmployeesAPI.getInstance()
