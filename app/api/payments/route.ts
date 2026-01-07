import { type NextRequest, NextResponse } from "next/server"
import { PaymentsService, Payment } from "@/lib/firebase/payments-service"
import { MembersService } from "@/lib/firebase/members-service"
import { ContractsService } from "@/lib/firebase/contracts-service"
import { requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const paymentsService = PaymentsService.getInstance()
    const membersService = MembersService.getInstance()
    const contractsService = ContractsService.getInstance()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const contractId = searchParams.get("contract_id") || undefined
    const paymentMethod = searchParams.get("payment_method") || undefined

    const { payments, total } = await paymentsService.getPayments({
      page,
      limit,
      status,
      memberId,
      contractId,
      paymentMethod
    })

    // Enrich payments with member and contract data
    const paymentsWithDetails = await Promise.all(
      payments.map(async (payment) => {
        let member = null
        let contract = null

        if (payment.member_id) {
          const memberData = await membersService.getMember(payment.member_id)
          if (memberData) {
            member = {
              id: memberData.id,
              name: memberData.name || `${memberData.first_name} ${memberData.paternal_last_name}`,
              email: memberData.email
            }
          }
        }

        if (payment.contract_id) {
          const contractData = await contractsService.getContract(payment.contract_id)
          if (contractData) {
            contract = {
              id: contractData.id,
              contract_type: contractData.contract_type,
              monthly_fee: contractData.monthly_fee
            }
          }
        }

        return {
          ...payment,
          member,
          contract
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: paymentsWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Payments] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const paymentsService = PaymentsService.getInstance()
    const membersService = MembersService.getInstance()
    const contractsService = ContractsService.getInstance()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid JSON in request body"
      }, { status: 400 })
    }

    const {
      contract_id,
      member_id,
      amount,
      payment_date,
      due_date,
      payment_method = "credit_card",
      status = "pending",
      transaction_id,
      notes
    } = body

    if (!contract_id || !member_id || !amount) {
      return NextResponse.json(
        { success: false, error: "Contract ID, member ID, and amount are required" },
        { status: 400 }
      )
    }

    // Verify contract exists
    const contract = await contractsService.getContract(contract_id)
    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      )
    }

    // Verify member exists
    const member = await membersService.getMember(member_id)
    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    const paymentData: Omit<Payment, 'id' | 'payment_id' | 'created_at' | 'updated_at'> = {
      contract_id,
      member_id,
      amount: Number(amount),
      payment_date: payment_date ? new Date(payment_date) : new Date(),
      due_date: due_date ? new Date(due_date) : undefined,
      payment_method,
      status,
      transaction_id,
      notes
    }

    const payment = await paymentsService.createPayment(paymentData)

    // Return with member and contract data
    const paymentWithDetails = {
      ...payment,
      member: {
        id: member.id,
        name: member.name || `${member.first_name} ${member.paternal_last_name}`,
        email: member.email
      },
      contract: {
        id: contract.id,
        contract_type: contract.contract_type,
        monthly_fee: contract.monthly_fee
      }
    }

    return NextResponse.json({
      success: true,
      data: paymentWithDetails
    })
  } catch (error) {
    console.error("[Payments] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
