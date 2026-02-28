import { type NextRequest, NextResponse } from "next/server"
import PaymentsService from "@/lib/firebase/payments-service"
import MembersService from "@/lib/firebase/members-service"
import ContractsService from "@/lib/firebase/contracts-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const paymentMethod = searchParams.get("payment_method") || undefined

    const { payments, hasMore } = await PaymentsService.listPayments({
      pageSize: limit,
      status,
      memberId,
      paymentMethod
    })

    const stats = await PaymentsService.getStats()

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit),
        hasMore
      },
    })
  } catch (error) {
    console.error("[Firebase] Payments API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { contract_id, member_id, amount, payment_date, payment_method = "credit_card", status = "completed", transaction_id, notes } = body

    if (!member_id || !amount || !payment_date) {
      return NextResponse.json({ success: false, error: "Member ID, amount, and payment date are required" }, { status: 400 })
    }

    // Verify member exists
    const member = await MembersService.getMember(member_id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Verify contract exists if provided
    let contractType: string | undefined
    if (contract_id) {
      const contract = await ContractsService.getContract(contract_id)
      if (!contract) {
        return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
      }
      contractType = contract.contract_type
    }

    const payment = await PaymentsService.createPayment({
      contract_id,
      member_id,
      member_name: member.name,
      member_email: member.email,
      contract_type: contractType,
      amount: Number(amount),
      payment_date,
      payment_method,
      status,
      transaction_id,
      notes,
    })

    return NextResponse.json({
      success: true,
      data: payment,
    })
  } catch (error) {
    console.error("[Firebase] Create payment API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
