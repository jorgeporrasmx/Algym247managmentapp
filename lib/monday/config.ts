/**
 * Monday.com Configuration
 * Centralized configuration for all Monday.com integrations
 */

// API Configuration
export const MONDAY_API_URL = 'https://api.monday.com/v2'
export const MONDAY_API_VERSION = '2023-10'

// Get API Token securely from environment
export function getMondayApiToken(): string {
  const token = process.env.MONDAY_API_TOKEN
  if (!token) {
    throw new Error('MONDAY_API_TOKEN environment variable is not set')
  }
  return token
}

// Get Webhook Secret for signature verification
export function getMondayWebhookSecret(): string {
  const secret = process.env.MONDAY_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[Monday Config] MONDAY_WEBHOOK_SECRET is not set. Webhook verification is disabled.')
    return ''
  }
  return secret
}

// Board IDs Configuration
export interface MondayBoardIds {
  members: string
  contracts: string
  payments: string
  employees: string
  inventory: string
  schedule: string
}

export function getMondayBoardIds(): MondayBoardIds {
  return {
    members: process.env.MONDAY_MEMBERS_BOARD_ID || '',
    contracts: process.env.MONDAY_CONTRACTS_BOARD_ID || '',
    payments: process.env.MONDAY_PAYMENTS_BOARD_ID || '',
    employees: process.env.MONDAY_EMPLOYEES_BOARD_ID || '',
    inventory: process.env.MONDAY_INVENTORY_BOARD_ID || '',
    schedule: process.env.MONDAY_SCHEDULE_BOARD_ID || '',
  }
}

// Validate that required board IDs are configured
export function validateBoardConfig(requiredBoards: (keyof MondayBoardIds)[]): { valid: boolean; missing: string[] } {
  const boardIds = getMondayBoardIds()
  const missing: string[] = []

  for (const board of requiredBoards) {
    if (!boardIds[board]) {
      missing.push(`MONDAY_${board.toUpperCase()}_BOARD_ID`)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

// Rate limiting configuration
export const RATE_LIMIT = {
  requestsPerMinute: 5000, // Monday's limit is 5,000/min for standard plans
  delayBetweenRequests: 200, // ms between requests for sync operations
  retryAttempts: 3,
  retryDelay: 1000, // ms initial retry delay (will be multiplied by attempt number)
}

// Sync configuration
export const SYNC_CONFIG = {
  batchSize: 50, // Number of items to sync in a single batch
  fullSyncInterval: 24 * 60 * 60 * 1000, // 24 hours in ms
  webhookRetryAttempts: 3,
}

// Column mappings for each entity type
export const COLUMN_MAPPINGS = {
  members: {
    first_name: 'text',
    paternal_last_name: 'text__1',
    maternal_last_name: 'text__2',
    email: 'email',
    primary_phone: 'phone',
    secondary_phone: 'phone__1',
    date_of_birth: 'date',
    status: 'status',
    selected_plan: 'dropdown',
    monthly_amount: 'numbers',
    start_date: 'date__1',
    expiration_date: 'date__2',
    city: 'text__3',
    state: 'text__4',
    employee: 'text__5',
    direct_debit: 'dropdown__1',
  },
  contracts: {
    member_reference: 'connect_boards',
    contract_type: 'dropdown',
    start_date: 'date',
    end_date: 'date__1',
    monthly_fee: 'numbers',
    status: 'status',
    payment_method: 'dropdown__1',
    auto_renewal: 'checkbox',
  },
  payments: {
    member_reference: 'connect_boards',
    contract_reference: 'connect_boards__1',
    amount: 'numbers',
    payment_type: 'dropdown',
    status: 'status',
    due_date: 'date',
    paid_date: 'date__1',
    payment_method: 'dropdown__1',
    reference: 'text',
  },
  employees: {
    first_name: 'text',
    paternal_last_name: 'text__1',
    maternal_last_name: 'text__2',
    email: 'email',
    primary_phone: 'phone',
    position: 'dropdown',
    department: 'dropdown__1',
    status: 'status',
    hire_date: 'date',
    access_level: 'dropdown__2',
    salary: 'numbers',
  },
  inventory: {
    name: 'name',
    brand: 'text',
    category: 'text_mkvf142x',
    price: 'precio',
    cost: 'numbers',
    stock: 'stok',
    supplier: 'text__1',
  },
  schedule: {
    class_name: 'name',
    instructor: 'text',
    class_type: 'dropdown',
    start_time: 'date',
    end_time: 'date__1',
    max_capacity: 'numbers',
    status: 'status',
  },
} as const

// Check if Monday integration is enabled
export function isMondayEnabled(): boolean {
  return !!process.env.MONDAY_API_TOKEN
}

// Check if webhook verification is enabled
export function isWebhookVerificationEnabled(): boolean {
  return !!process.env.MONDAY_WEBHOOK_SECRET
}
