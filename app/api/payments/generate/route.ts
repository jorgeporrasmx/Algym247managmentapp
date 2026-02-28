import { type NextRequest, NextResponse } from "next/server"
import PaymentsService from "@/lib/firebase/payments-service"
import MembersService from "@/lib/firebase/members-service"
import ContractsService from "@/lib/firebase/contracts-service"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      member_id,
      contract_id,
      amount,
      currency = 'MXN',
      payment_type,
      description,
      due_date
    } = body

    if (!member_id || !contract_id || !amount || !payment_type) {
      return NextResponse.json({
        success: false,
        error: "member_id, contract_id, amount, and payment_type are required"
      }, { status: 400 })
    }

    if (!['membership', 'renewal', 'late_fee', 'penalty', 'other'].includes(payment_type)) {
      return NextResponse.json({
        success: false,
        error: "Invalid payment_type. Must be one of: membership, renewal, late_fee, penalty, other"
      }, { status: 400 })
    }

    // Verify member exists
    const member = await MembersService.getMember(member_id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Verify contract exists
    const contract = await ContractsService.getContract(contract_id)
    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
    }

    // Generate payment reference
    const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`

    const payment = await PaymentsService.createPayment({
      contract_id,
      member_id,
      member_name: member.name,
      member_email: member.email,
      contract_type: contract.contract_type,
      amount: parseFloat(amount),
      payment_date: due_date || new Date().toISOString(),
      payment_method: 'transfer',
      status: 'pending',
      transaction_id: paymentReference,
      notes: description || `Payment for ${contract.contract_type} membership`,
    })

    return NextResponse.json({
      success: true,
      data: {
        payment_id: payment.id,
        payment_reference: paymentReference,
        amount: parseFloat(amount),
        currency,
        due_date,
        member_name: member.name,
        contract_type: contract.contract_type
      }
    })
  } catch (error) {
    console.error("[Firebase] Generate payment API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const memberId = searchParams.get("member_id") || undefined
    const status = searchParams.get("status") || undefined

    const { payments } = await PaymentsService.listPayments({
      memberId,
      status,
      pageSize: 100
    })

    return NextResponse.json({
      success: true,
      data: payments
    })
  } catch (error) {
    console.error("[Firebase] Fetch generated payments API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
