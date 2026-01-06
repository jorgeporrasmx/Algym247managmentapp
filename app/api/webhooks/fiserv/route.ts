import { type NextRequest, NextResponse } from "next/server"
import { PaymentsService } from "@/lib/firebase/payments-service"
import { MembersService } from "@/lib/firebase/members-service"
import { validateWebhookSignature, processWebhookPayload, markPaymentPaid, generateSampleWebhookPayload } from "@/lib/payment-services"

export async function POST(request: NextRequest) {
  try {
    const paymentsService = PaymentsService.getInstance()
    const membersService = MembersService.getInstance()

    // Get the raw body and signature for validation
    const body = await request.text()
    const signature = request.headers.get('x-fiserv-signature') || ''

    // Validate webhook signature (stub implementation)
    const isValidSignature = await validateWebhookSignature(body, signature)

    if (!isValidSignature) {
      console.error("[Fiserv] Invalid webhook signature")
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
      console.error("[Fiserv] Invalid JSON payload:", error)
      return NextResponse.json({
        success: false,
        error: "Invalid JSON payload"
      }, { status: 400 })
    }

    console.log("[Fiserv] Received webhook:", payload)

    // Process the webhook payload
    const paymentUpdate = await processWebhookPayload(payload)

    if (!paymentUpdate) {
      console.error("[Fiserv] Failed to process webhook payload")
      return NextResponse.json({
        success: false,
        error: "Failed to process webhook payload"
      }, { status: 400 })
    }

    // Find the payment record by reference
    const payment = await paymentsService.getPaymentByReference(paymentUpdate.paymentReference)

    if (!payment) {
      console.error("[Fiserv] Payment not found:", paymentUpdate.paymentReference)
      return NextResponse.json({
        success: false,
        error: "Payment not found"
      }, { status: 404 })
    }

    // Check if payment is already processed (idempotency)
    if (payment.status === paymentUpdate.status) {
      console.log("[Fiserv] Payment already processed with same status:", paymentUpdate.status)
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
    const updatedPayment = await paymentsService.updatePayment(payment.id!, {
      status: paymentUpdate.status as any,
      fiserv_reference: paymentUpdate.fiservPaymentId,
      transaction_id: paymentUpdate.externalReference,
      notes: `Webhook received at ${new Date().toISOString()}`
    })

    if (!updatedPayment) {
      console.error("[Fiserv] Error updating payment")
      return NextResponse.json({
        success: false,
        error: "Failed to update payment status"
      }, { status: 500 })
    }

    // Mark payment as paid using stub service
    await markPaymentPaid(paymentUpdate)

    // Get member info for response
    let memberName = 'Unknown'
    if (payment.member_id) {
      const member = await membersService.getMember(payment.member_id)
      if (member) {
        memberName = member.name || `${member.first_name} ${member.paternal_last_name}`
      }
    }

    console.log("[Fiserv] Successfully processed webhook:", {
      paymentId: updatedPayment.id,
      paymentReference: paymentUpdate.paymentReference,
      status: paymentUpdate.status,
      memberName
    })

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      data: {
        payment_id: updatedPayment.id,
        payment_reference: paymentUpdate.paymentReference,
        status: paymentUpdate.status,
        member_name: memberName,
        amount: payment.amount
      }
    })
  } catch (error) {
    console.error("[Fiserv] Webhook API error:", error)

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
    console.error("[Fiserv] Generate sample webhook API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
