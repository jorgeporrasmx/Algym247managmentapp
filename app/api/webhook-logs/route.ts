import { NextResponse } from "next/server"

// Webhook logs are stored in memory for now - in production, use Firebase
const webhookLogs: Array<{
  id: string
  source: string
  event_type: string
  payload: unknown
  status: string
  created_at: string
}> = []

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: webhookLogs.slice(-100), // Return last 100 logs
    })
  } catch (error) {
    console.error("[Webhook] Logs API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

// Helper to add logs (exported for use by webhook handlers)
export function addWebhookLog(log: {
  source: string
  event_type: string
  payload: unknown
  status: string
}) {
  webhookLogs.push({
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    created_at: new Date().toISOString()
  })

  // Keep only last 500 logs in memory
  if (webhookLogs.length > 500) {
    webhookLogs.splice(0, webhookLogs.length - 500)
  }
}
