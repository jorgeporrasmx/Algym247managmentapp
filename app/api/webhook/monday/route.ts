import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import { SupabaseClient } from "@supabase/supabase-js"
import { MondayAPIService } from "@/lib/monday-api"

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

interface MemberUpdateData {
  email?: string
  phone?: string
  status?: string
  name?: string
  updated_at: string
}

interface ContractUpdateData {
  start_date?: string
  end_date?: string
  monthly_fee?: number
  status?: string
  contract_type?: string
  updated_at: string
}

// Cache to invalidate when products change
let productCacheInvalidationTime: number = 0

async function handleProductChanges(payload: MondayWebhookPayload) {
  console.log("[Monday Webhook] Product change detected:", {
    type: payload.type,
    productId: payload.pulseId,
    productName: payload.pulseName,
    columnId: payload.columnId,
    newValue: payload.value
  })

  // Invalidate cache immediately when products change
  productCacheInvalidationTime = Date.now()
  console.log("[Monday Webhook] Product cache invalidated at:", productCacheInvalidationTime)

  // Handle specific product changes
  if (payload.type === "create_pulse") {
    console.log("[Monday Webhook] New product created:", payload.pulseName)
  } else if (payload.type === "update_column_value") {
    const relevantColumns = ['stok', 'precio', 'text_mkvf142x'] // stock, price, category
    
    if (relevantColumns.includes(payload.columnId || '')) {
      console.log("[Monday Webhook] Important product field updated:", {
        productId: payload.pulseId,
        field: payload.columnId,
        oldValue: payload.previousValue,
        newValue: payload.value
      })
      
      // You could add specific business logic here
      // For example, send notifications for low stock, price changes, etc.
      if (payload.columnId === 'stok' && payload.value?.numbers) {
        const newStock = parseInt(payload.value.numbers)
        if (newStock <= 2) {
          console.log("[Monday Webhook] LOW STOCK ALERT:", {
            productId: payload.pulseId,
            productName: payload.pulseName,
            stock: newStock
          })
          // Could send email/slack notification here
        }
      }
    }
  }
}

// Export function to check if cache should be invalidated
export function shouldInvalidateProductCache(lastCacheTime: number): boolean {
  return productCacheInvalidationTime > lastCacheTime
}

export async function GET(request: NextRequest) {
  const cacheCheck = request.headers.get('X-Cache-Check')
  
  if (cacheCheck) {
    // Return whether cache should be invalidated
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
    const payload: MondayWebhookPayload = await request.json()

    console.log("[Monday Webhook] Received:", JSON.stringify(payload, null, 2))

    // Log webhook for debugging
    try {
      const supabase = await createClient()
      await supabase.from("webhook_log").insert({
        webhook_type: payload.type,
        payload: payload,
        status: "received",
      })
    } catch (logError) {
      console.error("[Monday Webhook] Failed to log webhook:", logError)
    }

    // Handle different board types
    const PRODUCTS_BOARD_ID = 9944534259 // Your actual products board
    const MEMBERS_BOARD_ID = 123456789   // Replace with actual member board ID
    const CONTRACTS_BOARD_ID = 987654321 // Replace with actual contract board ID

    if (payload.boardId === PRODUCTS_BOARD_ID) {
      await handleProductChanges(payload)
    } else if (payload.boardId === MEMBERS_BOARD_ID) {
      const supabase = await createClient()
      if (payload.type === "create_pulse") {
        await handlePulseCreation(supabase, payload)
      } else if (payload.type === "update_column_value") {
        await handleMemberColumnUpdate(supabase, payload)
      }
    } else if (payload.boardId === CONTRACTS_BOARD_ID) {
      const supabase = await createClient()
      if (payload.type === "create_pulse") {
        await handlePulseCreation(supabase, payload)
      } else if (payload.type === "update_column_value") {
        await handleContractColumnUpdate(supabase, payload)
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error) {
    console.error("[Monday Webhook] Processing error:", error)

    try {
      const supabase = await createClient()
      await supabase.from("webhook_log").insert({
        webhook_type: "error",
        payload: { error: error instanceof Error ? error.message : "Unknown error" },
        status: "error",
        error_message: error instanceof Error ? error.message : "Unknown error",
      })
    } catch (logError) {
      console.error("[Monday Webhook] Failed to log error:", logError)
    }

    return NextResponse.json({ success: false, error: "Webhook processing failed" }, { status: 500 })
  }
}

async function handlePulseCreation(supabase: SupabaseClient, payload: MondayWebhookPayload) {
  console.log("[v0] Handling pulse creation for:", payload.pulseName)

  // You'll need to configure these board IDs based on your Monday.com setup
  const MEMBERS_BOARD_ID = 123456789 // Replace with actual member board ID
  const CONTRACTS_BOARD_ID = 987654321 // Replace with actual contract board ID

  if (payload.boardId === MEMBERS_BOARD_ID) {
    const { error } = await supabase.from("members").insert({
      monday_member_id: payload.pulseId.toString(),
      name: payload.pulseName,
      status: "active",
    })

    if (error) {
      console.error("[v0] Error creating member:", error)
      throw error
    }

    console.log("[v0] Created new member:", payload.pulseName)
  } else if (payload.boardId === CONTRACTS_BOARD_ID) {
    const { error } = await supabase.from("contracts").insert({
      monday_contract_id: payload.pulseId.toString(),
      contract_type: payload.pulseName,
      status: "active",
    })

    if (error) {
      console.error("[v0] Error creating contract:", error)
      throw error
    }

    console.log("[v0] Created new contract:", payload.pulseName)
  }
}

async function handleColumnUpdate(supabase: SupabaseClient, payload: MondayWebhookPayload) {
  console.log("[v0] Handling column update for pulse:", payload.pulseId)

  const MEMBERS_BOARD_ID = 123456789 // Replace with actual member board ID
  const CONTRACTS_BOARD_ID = 987654321 // Replace with actual contract board ID

  if (payload.boardId === MEMBERS_BOARD_ID) {
    await handleMemberColumnUpdate(supabase, payload)
  } else if (payload.boardId === CONTRACTS_BOARD_ID) {
    await handleContractColumnUpdate(supabase, payload)
  }
}

async function handleMemberColumnUpdate(supabase: SupabaseClient, payload: MondayWebhookPayload) {
  const mondayMemberId = payload.pulseId.toString()
  const updateData: MemberUpdateData = { updated_at: new Date().toISOString() }

  switch (payload.columnId) {
    case "email":
      if (payload.value?.email?.email) {
        updateData.email = payload.value.email.email
      }
      break
    case "phone":
      if (payload.value?.phone) {
        updateData.phone = payload.value.phone
      }
      break
    case "status":
      if (payload.value?.label?.text) {
        updateData.status = payload.value.label.text.toLowerCase()
      }
      break
    case "name":
      if (payload.value?.text) {
        updateData.name = payload.value.text
      }
      break
  }

  if (Object.keys(updateData).length > 1) {
    // More than just updated_at
    const { error } = await supabase.from("members").update(updateData).eq("monday_member_id", mondayMemberId)

    if (error) {
      console.error("[v0] Error updating member:", error)
      throw error
    }

    console.log("[v0] Updated member:", mondayMemberId, updateData)
  }
}

async function handleContractColumnUpdate(supabase: SupabaseClient, payload: MondayWebhookPayload) {
  const mondayContractId = payload.pulseId.toString()
  const updateData: ContractUpdateData = { updated_at: new Date().toISOString() }

  switch (payload.columnId) {
    case "member":
      // Handle member assignment - you'd need to map Monday member ID to your member ID
      break
    case "start_date":
      if (payload.value?.date?.date) {
        updateData.start_date = payload.value.date.date
      }
      break
    case "end_date":
      if (payload.value?.date?.date) {
        updateData.end_date = payload.value.date.date
      }
      break
    case "monthly_fee":
      if (payload.value?.numbers) {
        updateData.monthly_fee = Number.parseFloat(payload.value.numbers)
      }
      break
    case "status":
      if (payload.value?.label?.text) {
        updateData.status = payload.value.label.text.toLowerCase()
      }
      break
    case "contract_type":
      if (payload.value?.text) {
        updateData.contract_type = payload.value.text
      }
      break
  }

  if (Object.keys(updateData).length > 1) {
    // More than just updated_at
    const { error } = await supabase.from("contracts").update(updateData).eq("monday_contract_id", mondayContractId)

    if (error) {
      console.error("[v0] Error updating contract:", error)
      throw error
    }

    console.log("[v0] Updated contract:", mondayContractId, updateData)
  }
}
