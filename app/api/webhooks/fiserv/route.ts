import { type NextRequest, NextResponse } from "next/server"
import PaymentsService from "@/lib/firebase/payments-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the webhook
    console.log("[Fiserv] Webhook received:", JSON.stringify(body).substring(0, 200))

    const { payment_reference, status, transaction_id } = body

    if (!payment_reference) {
      return NextResponse.json({
        success: false,
        error: "payment_reference is required"
      }, { status: 400 })
    }

    // Find the payment by transaction_id (payment reference)
    const { payments } = await PaymentsService.listPayments({ pageSize: 500 })
    const payment = payments.find(p => p.transaction_id === payment_reference)

    if (!payment || !payment.id) {
      console.error("[Fiserv] Payment not found for reference:", payment_reference)
      return NextResponse.json({
        success: false,
        error: "Payment not found"
      }, { status: 404 })
    }

    // Update payment status
    const newStatus = status === 'approved' ? 'completed' : status === 'declined' ? 'failed' : payment.status
    await PaymentsService.updatePayment(payment.id, {
      status: newStatus,
      transaction_id: transaction_id || payment.transaction_id,
      notes: `${payment.notes || ''}\nFiserv webhook: ${status} at ${new Date().toISOString()}`.trim()
    })

    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully"
    })
  } catch (error) {
    console.error("[Fiserv] Webhook processing error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
