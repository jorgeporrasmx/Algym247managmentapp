import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

interface MemberData {
  id: string
  name: string
  email: string
  status: string
}

interface ContractWithMember {
  id: string
  monday_contract_id: string
  member_id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
  created_at: string
  updated_at: string
  members: MemberData
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100) // Max 100 per page
    const status = searchParams.get("status")
    const memberId = searchParams.get("member_id")
    const contractType = searchParams.get("contract_type")

    const offset = (page - 1) * limit

    let query = supabase
      .from("contracts")
      .select(
        `
        *,
        members (
          id,
          name,
          email,
          status
        )
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("status", status)
    }

    if (memberId) {
      query = query.eq("member_id", memberId)
    }

    if (contractType) {
      query = query.ilike("contract_type", `%${contractType}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: contracts, error, count } = await query as { data: ContractWithMember[] | null; error: Error | null; count: number | null }

    if (error) {
      console.error("[v0] Error fetching contracts:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch contracts" }, { status: 500 })
    }

    console.log("[v0] Contracts query result:", {
      contractsCount: contracts?.length || 0,
      totalCount: count,
      sampleContract: contracts?.[0] || null,
    })

    return NextResponse.json({
      success: true,
      data: contracts,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    console.error("[v0] Contracts API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { member_id, contract_type, start_date, end_date, monthly_fee, status = "active" } = body

    if (!member_id || !contract_type) {
      return NextResponse.json({ success: false, error: "Member ID and contract type are required" }, { status: 400 })
    }

    // Verify member exists
    const { data: member, error: memberError } = await supabase
      .from("members")
      .select("id, name")
      .eq("id", member_id)
      .single()

    if (memberError || !member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    // Generate a unique Monday.com contract ID
    const mondayContractId = `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { data: contract, error } = await supabase
      .from("contracts")
      .insert({
        monday_contract_id: mondayContractId,
        member_id,
        contract_type,
        start_date,
        end_date,
        monthly_fee: monthly_fee ? Number(monthly_fee) : null,
        status,
      })
      .select(`
        *,
        members (
          id,
          name,
          email,
          status
        )
      `)
      .single()

    if (error) {
      console.error("[v0] Error creating contract:", error)
      return NextResponse.json({ success: false, error: "Failed to create contract" }, { status: 500 })
    }

    console.log("[v0] Created new contract:", contract)

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    console.error("[v0] Create contract API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
