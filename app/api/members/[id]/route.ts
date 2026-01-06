import { type NextRequest, NextResponse } from "next/server"
import { MembersService } from "@/lib/firebase/members-service"
import { ContractsService } from "@/lib/firebase/contracts-service"

// GET /api/members/[id] - Get a single member with contracts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const membersService = MembersService.getInstance()
    const contractsService = ContractsService.getInstance()

    // Get member
    const member = await membersService.getMember(id)

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Get member's contracts
    const contracts = await contractsService.getContractsByMember(member.id!)

    return NextResponse.json({
      success: true,
      data: {
        ...member,
        contracts
      }
    })
  } catch (error) {
    console.error("[Members] Get member error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/members/[id] - Update a member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const membersService = MembersService.getInstance()

    // Check if member exists
    const member = await membersService.getMember(id)

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const allowedFields = [
      'first_name', 'paternal_last_name', 'maternal_last_name', 'name',
      'email', 'primary_phone', 'secondary_phone', 'date_of_birth',
      'address_1', 'city', 'state', 'zip_code',
      'status', 'selected_plan', 'monthly_amount', 'start_date', 'expiration_date',
      'access_type', 'direct_debit', 'employee', 'referred_member',
      'emergency_contact_name', 'emergency_contact_phone',
      'how_did_you_hear', 'notes'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // Update full name if name parts changed
    if (updateData.first_name || updateData.paternal_last_name) {
      const firstName = (updateData.first_name || member.first_name) as string
      const lastName = (updateData.paternal_last_name || member.paternal_last_name) as string
      updateData.name = `${firstName} ${lastName}`.trim()
    }

    await membersService.updateMember(id, updateData)

    // Get updated member
    const updatedMember = await membersService.getMember(id)

    console.log("[Members] Updated member:", updatedMember)

    return NextResponse.json({
      success: true,
      data: updatedMember
    })
  } catch (error) {
    console.error("[Members] Update member error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE /api/members/[id] - Delete a member (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const hard = searchParams.get("hard") === "true"

    const membersService = MembersService.getInstance()

    // Check if member exists
    const member = await membersService.getMember(id)

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      )
    }

    if (hard) {
      await membersService.hardDeleteMember(id)
      console.log("[Members] Hard deleted member:", id)
    } else {
      await membersService.deleteMember(id)
      console.log("[Members] Soft deleted member:", id)
    }

    return NextResponse.json({
      success: true,
      message: hard ? "Member permanently deleted" : "Member deactivated"
    })
  } catch (error) {
    console.error("[Members] Delete member error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
