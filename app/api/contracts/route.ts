import { type NextRequest, NextResponse } from "next/server"
import { ContractsService, Contract } from "@/lib/firebase/contracts-service"
import { MembersService } from "@/lib/firebase/members-service"
import { getAuthenticatedUser, requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // Require authentication for viewing contracts
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const contractsService = ContractsService.getInstance()
    const membersService = MembersService.getInstance()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const memberId = searchParams.get("member_id") || undefined
    const contractType = searchParams.get("contract_type") || undefined

    const { contracts, total } = await contractsService.getContracts({
      page,
      limit,
      status,
      memberId,
      contractType
    })

    // Enrich contracts with member data
    const contractsWithMembers = await Promise.all(
      contracts.map(async (contract) => {
        let member = null
        if (contract.member_id) {
          const memberData = await membersService.getMember(contract.member_id)
          if (memberData) {
            member = {
              id: memberData.id,
              name: memberData.name || `${memberData.first_name} ${memberData.paternal_last_name}`,
              email: memberData.email,
              status: memberData.status
            }
          }
        }
        return {
          ...contract,
          member
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: contractsWithMembers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Contracts] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication to create contracts
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const contractsService = ContractsService.getInstance()
    const membersService = MembersService.getInstance()

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
      member_id,
      contract_type,
      start_date,
      end_date,
      monthly_fee,
      payment_day,
      status = "active"
    } = body

    if (!member_id || !contract_type) {
      return NextResponse.json(
        { success: false, error: "Member ID and contract type are required" },
        { status: 400 }
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

    // Calculate total amount based on contract type
    const monthlyFeeNum = monthly_fee ? Number(monthly_fee) : 0
    let totalAmount = monthlyFeeNum
    switch (contract_type) {
      case 'quarterly':
        totalAmount = monthlyFeeNum * 3
        break
      case 'biannual':
        totalAmount = monthlyFeeNum * 6
        break
      case 'annual':
        totalAmount = monthlyFeeNum * 12
        break
    }

    const contractData: Omit<Contract, 'id' | 'contract_id' | 'created_at' | 'updated_at'> = {
      member_id,
      contract_type,
      start_date: start_date ? new Date(start_date) : new Date(),
      end_date: end_date ? new Date(end_date) : calculateEndDate(new Date(), contract_type),
      monthly_fee: monthlyFeeNum,
      total_amount: totalAmount,
      payment_day: payment_day || new Date().getDate(),
      status
    }

    const contract = await contractsService.createContract(contractData)

    // Return with member data
    const contractWithMember = {
      ...contract,
      member: {
        id: member.id,
        name: member.name || `${member.first_name} ${member.paternal_last_name}`,
        email: member.email,
        status: member.status
      }
    }

    return NextResponse.json({
      success: true,
      data: contractWithMember
    })
  } catch (error) {
    console.error("[Contracts] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Helper function to calculate end date based on contract type
function calculateEndDate(startDate: Date, contractType: string): Date {
  const endDate = new Date(startDate)

  switch (contractType) {
    case 'day_pass':
      endDate.setDate(endDate.getDate() + 1)
      break
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1)
      break
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3)
      break
    case 'biannual':
      endDate.setMonth(endDate.getMonth() + 6)
      break
    case 'annual':
      endDate.setFullYear(endDate.getFullYear() + 1)
      break
    default:
      endDate.setMonth(endDate.getMonth() + 1)
  }

  return endDate
}
