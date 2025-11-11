import { NextRequest, NextResponse } from "next/server"
import MondaySyncManager from "@/lib/monday/sync-manager"
import crypto from "crypto"

// Verify Monday webhook signature
function verifyMondayWebhook(body: string, signature: string | null): boolean {
  if (!signature || !process.env.MONDAY_WEBHOOK_SECRET) {
    // If no secret is configured, accept all webhooks (dev mode)
    console.warn("Monday webhook secret not configured")
    return true
  }
  
  const hmac = crypto.createHmac("sha256", process.env.MONDAY_WEBHOOK_SECRET)
  hmac.update(body)
  const expectedSignature = hmac.digest("hex")
  
  return signature === expectedSignature
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text()
    const signature = request.headers.get("x-monday-signature")
    
    // Verify webhook signature
    if (!verifyMondayWebhook(bodyText, signature)) {
      return NextResponse.json({
        success: false,
        error: "Invalid webhook signature"
      }, { status: 401 })
    }
    
    const body = JSON.parse(bodyText)
    
    // Monday sends a challenge for webhook verification
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge })
    }
    
    // Log webhook event
    console.log("[Monday Webhook] Received event:", {
      type: body.event?.type,
      boardId: body.event?.boardId,
      itemId: body.event?.itemId,
      userId: body.event?.userId
    })
    
    // Handle the webhook event
    if (body.event) {
      await MondaySyncManager.handleMondayWebhook(body)
    }
    
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully"
    })
  } catch (error) {
    console.error("[Monday Webhook] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET endpoint for webhook health check
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Monday webhook endpoint is active",
    timestamp: new Date().toISOString()
  })
}