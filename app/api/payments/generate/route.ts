import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import { createPaymentLink, type PaymentLinkRequest } from "@/lib/payment-services"

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
  currency: string
  payment_type: string
  status: string
  payment_reference: string
  payment_link: string
  fiserv_payment_id: string
  due_date: string
  paid_date: string
  created_at: string
  members: MemberData
  contracts: ContractData
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      member_id,
      contract_id,
      amount,
      currency = 'USD',
      payment_type,
      description,
      due_date
    } = body

    // Validation
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
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, name, email")
      .eq("id", member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ 
        success: false, 
        error: "Member not found" 
      }, { status: 404 })
    }

    // Verify contract exists
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, contract_type, monthly_fee")
      .eq("id", contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ 
        success: false, 
        error: "Contract not found" 
      }, { status: 404 })
    }

    // Generate payment link using stub service
    const paymentRequest: PaymentLinkRequest = {
      memberId: member_id,
      contractId: contract_id,
      amount: parseFloat(amount),
      currency,
      paymentType: payment_type as 'membership' | 'renewal' | 'late_fee' | 'penalty' | 'other',
      description: description || `Payment for ${contract.contract_type} membership`,
      dueDate: due_date ? new Date(due_date) : undefined
    }

    const paymentLinkResponse = await createPaymentLink(paymentRequest)

    if (!paymentLinkResponse.success) {
      return NextResponse.json({ 
        success: false, 
        error: paymentLinkResponse.error || "Failed to generate payment link" 
      }, { status: 500 })
    }

    // Save payment record to database
    const paymentData = {
      member_id,
      contract_id,
      amount: parseFloat(amount),
      currency,
      payment_type,
      status: 'pending',
      fiserv_payment_id: paymentLinkResponse.fiservPaymentId,
      payment_link: paymentLinkResponse.paymentLink,
      payment_reference: paymentLinkResponse.paymentReference,
      due_date: due_date || null,
      description: paymentRequest.description,
      metadata: {
        generated_at: new Date().toISOString(),
        stub_mode: true
      }
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert(paymentData)
      .select()
      .single()

    if (paymentError) {
      console.error("[v0] Error saving payment:", paymentError)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to save payment record" 
      }, { status: 500 })
    }

    console.log("[v0] Generated payment link:", {
      paymentId: payment.id,
      paymentReference: paymentLinkResponse.paymentReference,
      memberName: member.name,
      amount: amount
    })

    return NextResponse.json({
      success: true,
      data: {
        payment_id: payment.id,
        payment_reference: paymentLinkResponse.paymentReference,
        payment_link: paymentLinkResponse.paymentLink,
        fiserv_payment_id: paymentLinkResponse.fiservPaymentId,
        amount: payment.amount,
        currency: payment.currency,
        due_date: payment.due_date,
        expires_at: paymentLinkResponse.expiresAt,
        member_name: member.name,
        contract_type: contract.contract_type
      }
    })
  } catch (error) {
    console.error("[v0] Generate payment API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const member_id = searchParams.get("member_id")
    const contract_id = searchParams.get("contract_id")
    const status = searchParams.get("status")
    const payment_type = searchParams.get("payment_type")

    let query = supabase
      .from("payments")
      .select(`
        id,
        member_id,
        contract_id,
        amount,
        currency,
        payment_type,
        status,
        payment_reference,
        payment_link,
        fiserv_payment_id,
        due_date,
        paid_date,
        created_at,
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

    if (member_id) {
      query = query.eq("member_id", member_id)
    }

    if (contract_id) {
      query = query.eq("contract_id", contract_id)
    }

    if (status) {
      query = query.eq("status", status)
    }

    if (payment_type) {
      query = query.eq("payment_type", payment_type)
    }

    const { data: payments, error } = await query.order("created_at", { ascending: false }) as { data: PaymentWithRelations[] | null; error: Error | null }

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch payments" 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: payments
    })
  } catch (error) {
    console.error("[v0] Fetch payments API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
