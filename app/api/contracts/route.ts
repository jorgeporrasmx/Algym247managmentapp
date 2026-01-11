import { type NextRequest, NextResponse } from "next/server"
import ContractsService, { Contract } from "@/lib/firebase/contracts-service"
import MembersService from "@/lib/firebase/members-service"
import MondaySyncManager from "@/lib/monday/sync-manager"
import { isMondayEnabled } from "@/lib/monday/config"

/**
 * GET /api/contracts
 * List contracts with pagination and filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get("page") || "1")
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const contractType = searchParams.get("contract_type") || undefined

    const { contracts, hasMore } = await ContractsService.listContracts({
      pageSize: limit,
      status,
      member_id: memberId,
      contract_type: contractType
    })

    // Get stats
    const stats = await ContractsService.getStats()

    return NextResponse.json({
      success: true,
      data: contracts,
      pagination: {
        page,
        limit,
        total: stats.total,
        hasMore
      },
      stats: {
        total: stats.total,
        active: stats.active,
        expired: stats.expired,
        cancelled: stats.cancelled,
        needingSync: stats.needingSync
      }
    })
  } catch (error) {
    console.error("[Contracts API] Error fetching contracts:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch contracts"
    }, { status: 500 })
  }
}

/**
 * POST /api/contracts
 * Create a new contract
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      member_id,
      contract_type,
      start_date,
      end_date,
      monthly_fee,
      status = "active",
      payment_method,
      auto_renewal = false,
      terms,
      notes
    } = body

    // Validate required fields
    if (!member_id || !contract_type) {
      return NextResponse.json({
        success: false,
        error: "Member ID and contract type are required"
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

    // Create contract in Firebase
    const contract = await ContractsService.createContract({
      member_id,
      contract_type,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
      monthly_fee: monthly_fee ? Number(monthly_fee) : 0,
      status,
      payment_method,
      auto_renewal,
      terms,
      notes
    })

    console.log("[Contracts API] Created contract:", contract.id)

    // Trigger async sync to Monday if enabled
    if (isMondayEnabled() && contract.id) {
      MondaySyncManager.syncContractToMonday(contract.id)
        .then(result => {
          if (result.success) {
            console.log("[Contracts API] Synced to Monday:", result.mondayItemId)
          } else {
            console.error("[Contracts API] Monday sync failed:", result.error)
          }
        })
        .catch(err => console.error("[Contracts API] Monday sync error:", err))
    }

    return NextResponse.json({
      success: true,
      data: contract,
      member: {
        id: member.id,
        name: member.name,
        email: member.email
      }
    }, { status: 201 })
  } catch (error) {
    console.error("[Contracts API] Error creating contract:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create contract"
    }, { status: 500 })
  }
}
