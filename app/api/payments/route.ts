import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status")
    const memberId = searchParams.get("member_id")
    const paymentMethod = searchParams.get("payment_method")

    const offset = (page - 1) * limit

    let query = supabase
      .from("payments")
      .select(
        `
        *,
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
      `,
        { count: "exact" },
      )
      .order("payment_date", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    if (paymentMethod) {
      query = query.eq("payment_method", paymentMethod)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: payments, error, count } = await query

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch payments" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Payments API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { contract_id, member_id, amount, payment_date, payment_method = "credit_card", status = "completed", transaction_id, notes } = body

    if (!contract_id || !member_id || !amount || !payment_date) {
      return NextResponse.json({ success: false, error: "Contract ID, member ID, amount, and payment date are required" }, { status: 400 })
    }

    // Verify contract and member exist
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, contract_type")
      .eq("id", contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
    }

    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, name")
      .eq("id", member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        contract_id,
        member_id,
        amount: Number(amount),
        payment_date,
        payment_method,
        status,
        transaction_id,
        notes,
      })
      .select(`
        *,
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
      .single()

    if (error) {
      console.error("[v0] Error creating payment:", error)
      return NextResponse.json({ success: false, error: "Failed to create payment" }, { status: 500 })
    }

    console.log("[v0] Created new payment:", payment)

    return NextResponse.json({
      success: true,
      data: payment,
    })
  } catch (error) {
    console.error("[v0] Create payment API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
