/**
 * Monday.com Synchronization Service
 * Handles bidirectional sync between Firebase and Monday.com
 */

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN || ''

// Board IDs from environment
const BOARDS = {
  products: process.env.MONDAY_PRODUCTS_BOARD_ID || '',
  members: process.env.MONDAY_MEMBERS_BOARD_ID || '',
  employees: process.env.MONDAY_EMPLOYEES_BOARD_ID || '',
  contracts: process.env.MONDAY_CONTRACTS_BOARD_ID || ''
}

interface MondayColumn {
  id: string
  title: string
  type: string
}

interface MondayItem {
  id: string
  name: string
  column_values: {
    id: string
    text: string
    value: string
  }[]
}

interface SyncResult {
  success: boolean
  synced: number
  created: number
  updated: number
  errors: string[]
}

export class MondaySyncService {
  private static instance: MondaySyncService

  static getInstance(): MondaySyncService {
    if (!MondaySyncService.instance) {
      MondaySyncService.instance = new MondaySyncService()
    }
    return MondaySyncService.instance
  }

  /**
   * Check if Monday.com is properly configured
   */
  isConfigured(): boolean {
    return !!MONDAY_API_TOKEN && MONDAY_API_TOKEN.length > 10
  }

  /**
   * Make a GraphQL query to Monday.com
   */
  private async makeQuery(query: string, variables?: Record<string, unknown>): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('Monday API token not configured')
    }

    const response = await fetch(MONDAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_TOKEN,
        'API-Version': '2023-10'
      },
      body: JSON.stringify({ query, variables })
    })

    if (!response.ok) {
      throw new Error(`Monday API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(`Monday API error: ${data.errors[0]?.message}`)
    }

    return data.data
  }

  /**
   * Get board structure (columns)
   */
  async getBoardColumns(boardId: string): Promise<MondayColumn[]> {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          columns {
            id
            title
            type
          }
        }
      }
    `

    const data = await this.makeQuery(query)
    return data.boards[0]?.columns || []
  }

  /**
   * Get all items from a board
   */
  async getBoardItems(boardId: string): Promise<MondayItem[]> {
    const query = `
      query {
        boards(ids: [${boardId}]) {
          items_page(limit: 500) {
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

    const data = await this.makeQuery(query)
    return data.boards[0]?.items_page?.items || []
  }

  /**
   * Create an item in Monday.com
   */
  async createItem(boardId: string, itemName: string, columnValues: Record<string, any>): Promise<string> {
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
      boardId,
      itemName,
      columnValues: JSON.stringify(columnValues)
    }

    const data = await this.makeQuery(mutation, variables)
    return data.create_item.id
  }

  /**
   * Update an item in Monday.com
   */
  async updateItem(boardId: string, itemId: string, columnValues: Record<string, any>): Promise<boolean> {
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
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues)
    }

    await this.makeQuery(mutation, variables)
    return true
  }

  /**
   * Delete an item from Monday.com
   */
  async deleteItem(itemId: string): Promise<boolean> {
    const mutation = `
      mutation ($itemId: ID!) {
        delete_item (item_id: $itemId) {
          id
        }
      }
    `

    await this.makeQuery(mutation, { itemId })
    return true
  }

  /**
   * Sync members from Firebase to Monday.com
   */
  async syncMembersToMonday(members: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      created: 0,
      updated: 0,
      errors: []
    }

    if (!BOARDS.members) {
      result.success = false
      result.errors.push('MONDAY_MEMBERS_BOARD_ID not configured')
      return result
    }

    try {
      // Get existing items
      const existingItems = await this.getBoardItems(BOARDS.members)
      const existingByEmail = new Map(
        existingItems.map(item => {
          const emailCol = item.column_values.find(c => c.id === 'email' || c.id === 'correo')
          return [emailCol?.text || '', item]
        })
      )

      for (const member of members) {
        try {
          const columnValues = this.mapMemberToMondayColumns(member)
          const existing = existingByEmail.get(member.email)

          if (existing) {
            await this.updateItem(BOARDS.members, existing.id, columnValues)
            result.updated++
          } else {
            const itemId = await this.createItem(
              BOARDS.members,
              member.name || `${member.first_name} ${member.paternal_last_name}`,
              columnValues
            )
            result.created++
          }
          result.synced++
        } catch (error) {
          result.errors.push(`Member ${member.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Map member data to Monday.com column values
   */
  private mapMemberToMondayColumns(member: any): Record<string, any> {
    return {
      // Text columns
      email: member.email,
      telefono: member.primary_phone,
      direccion: member.address_1,
      ciudad: member.city,
      estado: member.state,
      cp: member.zip_code,

      // Status column
      status: { label: member.status === 'active' ? 'Activo' : 'Inactivo' },

      // Numbers
      monto_mensual: member.monthly_amount?.toString() || '0',

      // Date columns
      fecha_inicio: member.start_date ? { date: new Date(member.start_date).toISOString().split('T')[0] } : null,
      fecha_vencimiento: member.expiration_date ? { date: new Date(member.expiration_date).toISOString().split('T')[0] } : null
    }
  }

  /**
   * Sync employees from Firebase to Monday.com
   */
  async syncEmployeesToMonday(employees: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      created: 0,
      updated: 0,
      errors: []
    }

    if (!BOARDS.employees) {
      result.success = false
      result.errors.push('MONDAY_EMPLOYEES_BOARD_ID not configured')
      return result
    }

    try {
      const existingItems = await this.getBoardItems(BOARDS.employees)
      const existingByEmail = new Map(
        existingItems.map(item => {
          const emailCol = item.column_values.find(c => c.id === 'email' || c.id === 'correo')
          return [emailCol?.text || '', item]
        })
      )

      for (const employee of employees) {
        try {
          const columnValues = this.mapEmployeeToMondayColumns(employee)
          const existing = existingByEmail.get(employee.email)

          if (existing) {
            await this.updateItem(BOARDS.employees, existing.id, columnValues)
            result.updated++
          } else {
            await this.createItem(BOARDS.employees, employee.name, columnValues)
            result.created++
          }
          result.synced++
        } catch (error) {
          result.errors.push(`Employee ${employee.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Map employee data to Monday.com column values
   */
  private mapEmployeeToMondayColumns(employee: any): Record<string, any> {
    return {
      email: employee.email,
      telefono: employee.primary_phone,
      puesto: employee.position,
      departamento: employee.department,
      status: { label: employee.status === 'active' ? 'Activo' : 'Inactivo' },
      nivel_acceso: employee.access_level,
      salario: employee.salary?.toString() || '0',
      fecha_contratacion: employee.hire_date ? { date: new Date(employee.hire_date).toISOString().split('T')[0] } : null
    }
  }

  /**
   * Sync contracts from Firebase to Monday.com
   */
  async syncContractsToMonday(contracts: any[]): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      created: 0,
      updated: 0,
      errors: []
    }

    if (!BOARDS.contracts) {
      result.success = false
      result.errors.push('MONDAY_CONTRACTS_BOARD_ID not configured')
      return result
    }

    try {
      const existingItems = await this.getBoardItems(BOARDS.contracts)
      const existingByContractId = new Map(
        existingItems.map(item => {
          const contractIdCol = item.column_values.find(c => c.id === 'contract_id' || c.id === 'id_contrato')
          return [contractIdCol?.text || '', item]
        })
      )

      for (const contract of contracts) {
        try {
          const columnValues = this.mapContractToMondayColumns(contract)
          const existing = existingByContractId.get(contract.contract_id)

          if (existing) {
            await this.updateItem(BOARDS.contracts, existing.id, columnValues)
            result.updated++
          } else {
            await this.createItem(BOARDS.contracts, contract.contract_id, columnValues)
            result.created++
          }
          result.synced++
        } catch (error) {
          result.errors.push(`Contract ${contract.contract_id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    } catch (error) {
      result.success = false
      result.errors.push(error instanceof Error ? error.message : 'Unknown error')
    }

    return result
  }

  /**
   * Map contract data to Monday.com column values
   */
  private mapContractToMondayColumns(contract: any): Record<string, any> {
    const statusLabels: Record<string, string> = {
      active: 'Activo',
      expired: 'Vencido',
      cancelled: 'Cancelado',
      pending: 'Pendiente',
      suspended: 'Suspendido'
    }

    const typeLabels: Record<string, string> = {
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      biannual: 'Semestral',
      annual: 'Anual',
      day_pass: 'Pase de día'
    }

    return {
      member_id: contract.member_id,
      tipo_contrato: typeLabels[contract.contract_type] || contract.contract_type,
      status: { label: statusLabels[contract.status] || contract.status },
      monto_mensual: contract.monthly_fee?.toString() || '0',
      fecha_inicio: contract.start_date ? { date: new Date(contract.start_date).toISOString().split('T')[0] } : null,
      fecha_fin: contract.end_date ? { date: new Date(contract.end_date).toISOString().split('T')[0] } : null
    }
  }

  /**
   * Get sync status for all boards
   */
  async getSyncStatus(): Promise<{
    configured: boolean
    boards: Record<string, { configured: boolean; itemCount?: number }>
  }> {
    const status = {
      configured: this.isConfigured(),
      boards: {} as Record<string, { configured: boolean; itemCount?: number }>
    }

    for (const [name, boardId] of Object.entries(BOARDS)) {
      if (!boardId) {
        status.boards[name] = { configured: false }
        continue
      }

      try {
        const items = await this.getBoardItems(boardId)
        status.boards[name] = { configured: true, itemCount: items.length }
      } catch {
        status.boards[name] = { configured: true, itemCount: 0 }
      }
    }

    return status
  }
}
