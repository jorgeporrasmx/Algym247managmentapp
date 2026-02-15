/**
 * Monday.com Webhook Handler for Firebase
 * 
 * Handles webhooks from Monday.com and syncs data to Firebase Firestore
 */

import { from, Collections } from './db'

export interface MondayWebhookPayload {
  type: 'create_pulse' | 'update_column_value' | 'delete_pulse'
  triggerTime: string
  subscriptionId: number
  userId: number
  originalTriggerUuid: string
  boardId: number
  pulseId: number
  pulseName: string
  columnId?: string
  columnType?: string
  value?: {
    label?: {
      index?: number
      text?: string
    }
    date?: {
      date?: string
      time?: string
    }
    text?: string
    email?: {
      email?: string
      text?: string
    }
    phone?: string
    numbers?: string
  }
  previousValue?: unknown
  changedAt: number
  isTopGroup: boolean
  groupId: string
}

// Board IDs - Al Gym Monday.com
const BOARDS = {
  MEMBERS: 18092113859,
  CONTRACTS: 18092113859, // Same board, different groups
  PRODUCTS: 9944534259
}

// Column mappings for Gestión de Socios board
const MEMBER_COLUMNS = {
  EMAIL: 'long_text_mkwb9yh5',
  PHONE: 'phone_mkwaaa5n',
  STATUS: 'color_mkwaxzng',
  PLAN: 'color_mkwb67p6',
  START_DATE: 'date_mkwac0x5',
  END_DATE: 'date_mkwa98h',
  AMOUNT: 'text_mkwbp91v',
  MEMBER_ID: 'text_mkwbd9d',
  PAYMENT_STATUS: 'color_mkwb9cmt',
  PAYMENT_DATE: 'date_mkwah0ms',
  PAYMENT_METHOD: 'dropdown_mkwapy8v',
  AUTO_RENEWAL: 'boolean_mkwanv55',
  CONTRACT_LINK: 'link_mkwbrn8j',
  NOTES: 'long_text_mkwa8nbm'
}

/**
 * Log webhook to Firestore
 */
async function logWebhook(
  type: string, 
  payload: unknown, 
  status: 'received' | 'processed' | 'error',
  errorMessage?: string
) {
  try {
    await from(Collections.WEBHOOK_LOGS).insert({
      webhook_type: type,
      payload,
      status,
      error_message: errorMessage || null,
      processed_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('[Webhook] Failed to log:', error)
  }
}

/**
 * Handle new member creation
 */
async function handleMemberCreation(payload: MondayWebhookPayload) {
  console.log('[Webhook] Creating new member:', payload.pulseName)
  
  const { error } = await from(Collections.MEMBERS).insert({
    monday_member_id: payload.pulseId.toString(),
    name: payload.pulseName,
    status: 'active',
    group_id: payload.groupId
  })
  
  if (error) {
    console.error('[Webhook] Error creating member:', error)
    throw error
  }
  
  console.log('[Webhook] Member created successfully')
}

/**
 * Handle member column update
 */
async function handleMemberUpdate(payload: MondayWebhookPayload) {
  const mondayId = payload.pulseId.toString()
  const updateData: Record<string, unknown> = {}
  
  switch (payload.columnId) {
    case MEMBER_COLUMNS.EMAIL:
      if (payload.value?.text) {
        updateData.email = payload.value.text
      }
      break
      
    case MEMBER_COLUMNS.PHONE:
      if (payload.value?.phone) {
        updateData.phone = payload.value.phone
      }
      break
      
    case MEMBER_COLUMNS.STATUS:
      if (payload.value?.label?.text) {
        updateData.status = payload.value.label.text.toLowerCase()
      }
      break
      
    case MEMBER_COLUMNS.PLAN:
      if (payload.value?.label?.text) {
        updateData.plan = payload.value.label.text
      }
      break
      
    case MEMBER_COLUMNS.START_DATE:
      if (payload.value?.date?.date) {
        updateData.start_date = payload.value.date.date
      }
      break
      
    case MEMBER_COLUMNS.END_DATE:
      if (payload.value?.date?.date) {
        updateData.end_date = payload.value.date.date
      }
      break
      
    case MEMBER_COLUMNS.AMOUNT:
      if (payload.value?.text) {
        updateData.monthly_fee = parseFloat(payload.value.text) || 0
      }
      break
      
    case MEMBER_COLUMNS.MEMBER_ID:
      if (payload.value?.text) {
        updateData.member_id = payload.value.text
      }
      break
      
    case MEMBER_COLUMNS.PAYMENT_STATUS:
      if (payload.value?.label?.text) {
        updateData.payment_status = payload.value.label.text
      }
      break
      
    case MEMBER_COLUMNS.PAYMENT_DATE:
      if (payload.value?.date?.date) {
        updateData.last_payment_date = payload.value.date.date
      }
      break
      
    case MEMBER_COLUMNS.PAYMENT_METHOD:
      if (payload.value?.text) {
        updateData.payment_method = payload.value.text
      }
      break
      
    case MEMBER_COLUMNS.AUTO_RENEWAL:
      updateData.auto_renewal = payload.value?.text === 'true'
      break
      
    case MEMBER_COLUMNS.NOTES:
      if (payload.value?.text) {
        updateData.notes = payload.value.text
      }
      break
      
    case 'name':
      if (payload.pulseName) {
        updateData.name = payload.pulseName
      }
      break
  }
  
  if (Object.keys(updateData).length > 0) {
    const { error } = await from(Collections.MEMBERS)
      .update(updateData)
      .eq('monday_member_id', mondayId)
    
    if (error) {
      console.error('[Webhook] Error updating member:', error)
      throw error
    }
    
    console.log('[Webhook] Member updated:', mondayId, updateData)
  }
}

/**
 * Handle new contract creation
 */
async function handleContractCreation(payload: MondayWebhookPayload) {
  console.log('[Webhook] Creating new contract:', payload.pulseName)
  
  const { error } = await from(Collections.CONTRACTS).insert({
    monday_contract_id: payload.pulseId.toString(),
    contract_type: payload.pulseName,
    status: 'active',
    group_id: payload.groupId
  })
  
  if (error) {
    console.error('[Webhook] Error creating contract:', error)
    throw error
  }
  
  console.log('[Webhook] Contract created successfully')
}

/**
 * Handle product changes
 */
async function handleProductChange(payload: MondayWebhookPayload) {
  console.log('[Webhook] Product change:', {
    type: payload.type,
    productId: payload.pulseId,
    productName: payload.pulseName,
    column: payload.columnId
  })
  
  // Log for monitoring
  if (payload.columnId === 'stok' && payload.value?.numbers) {
    const stock = parseInt(payload.value.numbers)
    if (stock <= 2) {
      console.log('[Webhook] LOW STOCK ALERT:', {
        productId: payload.pulseId,
        productName: payload.pulseName,
        stock
      })
      // TODO: Send notification
    }
  }
}

/**
 * Main webhook handler
 */
export async function handleMondayWebhook(payload: MondayWebhookPayload) {
  console.log('[Webhook] Received:', JSON.stringify(payload, null, 2))
  
  // Log webhook
  await logWebhook(payload.type, payload, 'received')
  
  try {
    // Route based on board
    if (payload.boardId === BOARDS.MEMBERS) {
      if (payload.type === 'create_pulse') {
        await handleMemberCreation(payload)
      } else if (payload.type === 'update_column_value') {
        await handleMemberUpdate(payload)
      }
    } else if (payload.boardId === BOARDS.CONTRACTS) {
      if (payload.type === 'create_pulse') {
        await handleContractCreation(payload)
      }
    } else if (payload.boardId === BOARDS.PRODUCTS) {
      await handleProductChange(payload)
    }
    
    // Log success
    await logWebhook(payload.type, payload, 'processed')
    
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await logWebhook(payload.type, payload, 'error', errorMessage)
    throw error
  }
}

export { BOARDS, MEMBER_COLUMNS }
