import { type NextRequest, NextResponse } from "next/server"
import ContractsService from "@/lib/firebase/contracts-service"
import MembersService from "@/lib/firebase/members-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const contractType = searchParams.get("contract_type") || undefined

    const { contracts, hasMore } = await ContractsService.listContracts({
      pageSize: limit,
      status,
      memberId,
      contractType
    })

    const stats = await ContractsService.getStats()

    return NextResponse.json({
      success: true,
      data: contracts,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit),
        hasMore
      },
    })
  } catch (error) {
    console.error("[Firebase] Contracts API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { member_id, contract_type, start_date, end_date, monthly_fee, status = "active", notes } = body

    if (!member_id || !contract_type) {
      return NextResponse.json({ success: false, error: "Member ID and contract type are required" }, { status: 400 })
    }

    // Verify member exists
    const member = await MembersService.getMember(member_id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    const contract = await ContractsService.createContract({
      member_id,
      member_name: member.name,
      member_email: member.email,
      contract_type,
      start_date,
      end_date,
      monthly_fee: monthly_fee ? Number(monthly_fee) : undefined,
      status,
      notes,
    })

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    console.error("[Firebase] Create contract API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
