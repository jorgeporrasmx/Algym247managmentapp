import { type NextRequest, NextResponse } from "next/server"
import MembersService from "@/lib/firebase/members-service"
import MondaySyncManager from "@/lib/monday/sync-manager"
import { getAuthenticatedUser, requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // Check authentication - return limited data if not authenticated
    const authResult = await getAuthenticatedUser(request)
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const status = searchParams.get("status") || undefined
    const search = searchParams.get("search") || undefined

    // Get members from Firebase
    const { members, hasMore } = await MembersService.listMembers({
      pageSize: limit,
      status,
      searchTerm: search
    })

    // Get statistics
    const stats = await MembersService.getStats()

    console.log("[Firebase] Members query result:", {
      membersCount: members.length,
      totalCount: stats.total,
      sampleMember: members[0] || null,
    })

    return NextResponse.json({
      success: true,
      data: members,
      pagination: {
        page,
        limit,
        total: stats.total,
        totalPages: Math.ceil(stats.total / limit),
        hasMore
      },
      stats
    })
  } catch (error) {
    console.error("[Firebase] Members API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication to create members
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

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
      name,
      person,
      status = "active",
      start_date,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth,
      email,
      primary_phone,
      address_1,
      access_type,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      referred_member,
      selected_plan,
      employee = "",
      member_id,
      monthly_amount,
      expiration_date,
      direct_debit = "No domiciliado",
      how_did_you_hear,
      contract_link,
      version = "1.0"
    } = body

    // Validation
    if (!name && (!first_name || !paternal_last_name)) {
      return NextResponse.json({ 
        success: false, 
        error: "Either name or both first_name and paternal_last_name are required" 
      }, { status: 400 })
    }

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: "Email is required" 
      }, { status: 400 })
    }

    if (!primary_phone) {
      return NextResponse.json({ 
        success: false, 
        error: "Primary phone is required" 
      }, { status: 400 })
    }

    // Prepare the member data
    const memberData = {
      name: name || `${first_name} ${paternal_last_name}`.trim(),
      person,
      status,
      start_date: start_date ? new Date(start_date) : undefined,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      email,
      primary_phone,
      address_1,
      access_type,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      referred_member,
      selected_plan,
      employee,
      member_id,
      monthly_amount: monthly_amount ? parseFloat(monthly_amount) : undefined,
      expiration_date: expiration_date ? new Date(expiration_date) : undefined,
      direct_debit,
      how_did_you_hear,
      contract_link,
      version
    }

    // Create member in Firebase
    const member = await MembersService.createMember(memberData)

    console.log("[Firebase] Created new member:", member)

    // Sync to Monday.com in the background
    if (member.id) {
      MondaySyncManager.syncMemberToMonday(member.id).catch(error => {
        console.error("[Monday] Failed to sync new member:", error)
      })
    }

    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error) {
    console.error("[Firebase] Create member API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }, { status: 500 })
  }
}