import { type NextRequest, NextResponse } from "next/server"
import MembersService from "@/lib/firebase/members-service"
import ContractsService from "@/lib/firebase/contracts-service"

interface MondayWebhookPayload {
  type: "create_pulse" | "update_column_value"
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

// Cache to invalidate when products change
let productCacheInvalidationTime: number = 0

async function handleProductChanges(payload: MondayWebhookPayload) {
  productCacheInvalidationTime = Date.now()

  if (payload.columnId === 'stok' && payload.value?.numbers) {
    const newStock = parseInt(payload.value.numbers)
    if (newStock <= 2) {
      console.log("[Monday Webhook] LOW STOCK ALERT:", {
        productName: payload.pulseName,
        stock: newStock
      })
    }
  }
}

function shouldInvalidateProductCache(lastCacheTime: number): boolean {
  return productCacheInvalidationTime > lastCacheTime
}

export async function GET(request: NextRequest) {
  const cacheCheck = request.headers.get('X-Cache-Check')

  if (cacheCheck) {
    const url = new URL(request.url)
    const lastCacheTime = parseInt(url.searchParams.get('lastCacheTime') || '0')

    return NextResponse.json({
      shouldInvalidate: shouldInvalidateProductCache(lastCacheTime),
      lastInvalidation: productCacheInvalidationTime
    })
  }

  return NextResponse.json({
    message: "Monday.com webhook endpoint",
    lastInvalidation: productCacheInvalidationTime
  })
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    // Handle Monday.com webhook verification challenge
    if (payload.challenge) {
      return NextResponse.json({ challenge: payload.challenge })
    }

    const webhookPayload = payload as MondayWebhookPayload

    // Handle different board types
    const PRODUCTS_BOARD_ID = parseInt(process.env.MONDAY_PRODUCTS_BOARD_ID || '9944534259')
    const MEMBERS_BOARD_ID = parseInt(process.env.MONDAY_MEMBERS_BOARD_ID || '18092113859')

    if (webhookPayload.boardId === PRODUCTS_BOARD_ID) {
      await handleProductChanges(webhookPayload)
    } else if (webhookPayload.boardId === MEMBERS_BOARD_ID) {
      if (webhookPayload.type === "create_pulse") {
        await handleMemberCreation(webhookPayload)
      } else if (webhookPayload.type === "update_column_value") {
        await handleMemberUpdate(webhookPayload)
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error) {
    console.error("[Monday Webhook] Processing error:", error)
    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handleMemberCreation(payload: MondayWebhookPayload) {
  const nameParts = payload.pulseName.split(' ')
  const firstName = nameParts[0] || 'Unknown'
  const lastName = nameParts.slice(1).join(' ') || 'Unknown'

  await MembersService.createMember({
    monday_item_id: payload.pulseId.toString(),
    name: payload.pulseName,
    first_name: firstName,
    paternal_last_name: lastName,
    email: `pending_${payload.pulseId}@monday.com`,
    primary_phone: '0000000000',
    status: 'active',
    sync_status: 'synced',
  })
}

async function handleMemberUpdate(payload: MondayWebhookPayload) {
  const mondayId = payload.pulseId.toString()

  // Find member by monday_item_id
  const members = await MembersService.searchMembers({ monday_item_id: mondayId })

  if (members.length === 0) return

  const member = members[0]
  if (!member.id) return

  const updates: Record<string, unknown> = {}

  switch (payload.columnId) {
    case 'email':
      if (payload.value?.text) updates.email = payload.value.text
      break
    case 'phone':
      if (payload.value?.phone) updates.primary_phone = payload.value.phone
      break
    case 'status':
      if (payload.value?.label?.text) updates.status = payload.value.label.text.toLowerCase()
      break
  }

  if (Object.keys(updates).length > 0) {
    await MembersService.updateMember(member.id, updates)
  }
}

// Contracts webhook handler (for future use when contracts have their own board)
export async function handleContractCreation(payload: MondayWebhookPayload) {
  await ContractsService.createContract({
    monday_contract_id: payload.pulseId.toString(),
    contract_type: payload.pulseName,
    member_id: '',
    status: 'active',
  })
}
