import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import { validateWebhookSignature, processWebhookPayload, markPaymentPaid, generateSampleWebhookPayload } from "@/lib/payment-services"

interface MemberData {
  id: string
  name: string
  email: string
}

interface ContractData {
  id: string
  contract_type: string
  monthly_fee: number
}

interface PaymentWithRelations {
  id: string
  member_id: string
  contract_id: string
  amount: number
  status: string
  payment_reference: string
  fiserv_payment_id: string
  metadata: Record<string, unknown>
  members: MemberData
  contracts: ContractData
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the raw body and signature for validation
    const body = await request.text()
    const signature = request.headers.get('x-fiserv-signature') || ''
    
    // Validate webhook signature (stub implementation)
    const isValidSignature = await validateWebhookSignature(body, signature)
    
    if (!isValidSignature) {
      console.error("[v0] Invalid webhook signature")
      return NextResponse.json({ 
        success: false, 
        error: "Invalid signature" 
      }, { status: 401 })
    }

    // Parse the payload
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(body)
    } catch (error) {
      console.error("[v0] Invalid JSON payload:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Invalid JSON payload" 
      }, { status: 400 })
    }

    console.log("[v0] Received Fiserv webhook:", payload)

    // Process the webhook payload
    const paymentUpdate = await processWebhookPayload(payload)
    
    if (!paymentUpdate) {
      console.error("[v0] Failed to process webhook payload")
      return NextResponse.json({ 
        success: false, 
        error: "Failed to process webhook payload" 
      }, { status: 400 })
    }

    // Find the payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        member_id,
        contract_id,
        amount,
        status,
        payment_reference,
        fiserv_payment_id,
        metadata,
        members (
          id,
          name,
          email
        ),
        contracts (
          id,
          contract_type,
          monthly_fee
        )
      `)
      .eq("payment_reference", paymentUpdate.paymentReference)
      .single() as { data: PaymentWithRelations | null; error: Error | null }

    if (paymentError || !payment) {
      console.error("[v0] Payment not found:", paymentUpdate.paymentReference)
      return NextResponse.json({ 
        success: false, 
        error: "Payment not found" 
      }, { status: 404 })
    }

    // Check if payment is already processed (idempotency)
    if (payment.status === paymentUpdate.status) {
      console.log("[v0] Payment already processed with same status:", paymentUpdate.status)
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        data: {
          payment_id: payment.id,
          status: payment.status,
          already_processed: true
        }
      })
    }

    // Update payment status
    const updateData: Record<string, unknown> = {
      status: paymentUpdate.status,
      fiserv_payment_id: paymentUpdate.fiservPaymentId,
      metadata: {
        ...payment.metadata,
        webhook_received_at: new Date().toISOString(),
        webhook_payload: payload
      }
    }

    if (paymentUpdate.paidDate) {
      updateData.paid_date = paymentUpdate.paidDate
    }

    if (paymentUpdate.externalReference) {
      updateData.external_reference = paymentUpdate.externalReference
    }

    const { data: updatedPayment, error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", payment.id)
      .select()
      .single()

    if (updateError) {
      console.error("[v0] Error updating payment:", updateError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to update payment status" 
      }, { status: 500 })
    }

    // Mark payment as paid using stub service
    await markPaymentPaid(paymentUpdate)

    // Log webhook processing
    await supabase
      .from("webhook_log")
      .insert({
        webhook_type: 'fiserv_payment_update',
        payload: payload,
        status: 'processed',
        processed_at: new Date().toISOString()
      })

    console.log("[v0] Successfully processed Fiserv webhook:", {
      paymentId: updatedPayment.id,
      paymentReference: paymentUpdate.paymentReference,
      status: paymentUpdate.status,
      memberName: payment.members?.name
    })

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      data: {
        payment_id: updatedPayment.id,
        payment_reference: paymentUpdate.paymentReference,
        status: paymentUpdate.status,
        member_name: payment.members?.name,
        amount: payment.amount
      }
    })
  } catch (error) {
    console.error("[v0] Fiserv webhook API error:", error)
    
    // Log error to webhook_log
    try {
      const supabase = await createClient()
      await supabase
        .from("webhook_log")
        .insert({
          webhook_type: 'fiserv_payment_update',
          payload: { error: error instanceof Error ? error.message : 'Unknown error' },
          status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          processed_at: new Date().toISOString()
        })
    } catch (logError) {
      console.error("[v0] Failed to log webhook error:", logError)
    }

    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

// Test endpoint for generating sample webhook payloads
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const payment_reference = searchParams.get("payment_reference")
    const status = searchParams.get("status") as 'paid' | 'failed' | 'refunded' | 'cancelled' || 'paid'

    if (!payment_reference) {
      return NextResponse.json({ 
        success: false, 
        error: "payment_reference parameter is required" 
      }, { status: 400 })
    }

    // Generate sample webhook payload
    const samplePayload = generateSampleWebhookPayload(payment_reference, status)

    return NextResponse.json({
      success: true,
      message: "Sample webhook payload generated",
      data: {
        payload: samplePayload,
        curl_command: `curl -X POST ${request.nextUrl.origin}/api/webhooks/fiserv \\
  -H "Content-Type: application/json" \\
  -H "x-fiserv-signature: stub_signature_${Date.now()}" \\
  -d '${JSON.stringify(samplePayload)}'`
      }
    })
  } catch (error) {
    console.error("[v0] Generate sample webhook API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
