import { type NextRequest, NextResponse } from "next/server"
import PaymentsService, { Payment } from "@/lib/firebase/payments-service"
import MembersService from "@/lib/firebase/members-service"
import ContractsService from "@/lib/firebase/contracts-service"
import MondaySyncManager from "@/lib/monday/sync-manager"
import { isMondayEnabled } from "@/lib/monday/config"

/**
 * GET /api/payments
 * List payments with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const paymentType = searchParams.get("payment_type") || undefined
    const paymentMethod = searchParams.get("payment_method") || undefined

    const { payments, hasMore } = await PaymentsService.listPayments({
      pageSize: limit,
      status,
      member_id: memberId,
      payment_type: paymentType,
      payment_method: paymentMethod
    })

    // Get stats
    const stats = await PaymentsService.getStats()

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total: stats.total,
        hasMore
      },
      stats: {
        total: stats.total,
        pending: stats.pending,
        paid: stats.paid,
        failed: stats.failed,
        totalAmount: stats.totalAmount,
        paidAmount: stats.paidAmount,
        pendingAmount: stats.pendingAmount,
        needingSync: stats.needingSync
      }
    })
  } catch (error) {
    console.error("[Payments API] Error fetching payments:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch payments"
    }, { status: 500 })
  }
}

/**
 * POST /api/payments
 * Create a new payment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      member_id,
      contract_id,
      amount,
      currency = "MXN",
      payment_type = "membership",
      status = "pending",
      due_date,
      payment_method = "cash",
      description,
      notes
    } = body

    // Validate required fields
    if (!member_id || !amount) {
      return NextResponse.json({
        success: false,
        error: "Member ID and amount are required"
      }, { status: 400 })
    }

    // Verify member exists
    const member = await MembersService.getMember(member_id)
    if (!member) {
      return NextResponse.json({
        success: false,
        error: "Member not found"
      }, { status: 404 })
    }

    // Verify contract exists if provided
    if (contract_id) {
      const contract = await ContractsService.getContract(contract_id)
      if (!contract) {
        return NextResponse.json({
          success: false,
          error: "Contract not found"
        }, { status: 404 })
      }
    }

    // Generate payment reference
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create payment in Firebase
    const payment = await PaymentsService.createPayment({
      member_id,
      contract_id,
      amount: Number(amount),
      currency,
      payment_type,
      status,
      due_date: due_date ? new Date(due_date) : new Date(),
      payment_method,
      payment_reference: paymentReference,
      description,
      notes
    })

    console.log("[Payments API] Created payment:", payment.id)

    // Trigger async sync to Monday if enabled
    if (isMondayEnabled() && payment.id) {
      MondaySyncManager.syncPaymentToMonday(payment.id)
        .then(result => {
          if (result.success) {
            console.log("[Payments API] Synced to Monday:", result.mondayItemId)
          } else {
            console.error("[Payments API] Monday sync failed:", result.error)
          }
        })
        .catch(err => console.error("[Payments API] Monday sync error:", err))
    }

    return NextResponse.json({
      success: true,
      data: payment,
      member: {
        id: member.id,
        name: member.name,
        email: member.email
      }
    }, { status: 201 })
  } catch (error) {
    console.error("[Payments API] Error creating payment:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create payment"
    }, { status: 500 })
  }
}
