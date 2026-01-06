import { type NextRequest, NextResponse } from "next/server"
import { ContractsService } from "@/lib/firebase/contracts-service"
import { MembersService } from "@/lib/firebase/members-service"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractsService = ContractsService.getInstance()
    const membersService = MembersService.getInstance()

    const contract = await contractsService.getContract(id)

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      )
    }

    // Enrich with member data
    let member = null
    if (contract.member_id) {
      const memberData = await membersService.getMember(contract.member_id)
      if (memberData) {
        member = {
          id: memberData.id,
          name: memberData.name || `${memberData.first_name} ${memberData.paternal_last_name}`,
          email: memberData.email,
          primary_phone: memberData.primary_phone,
          status: memberData.status,
          created_at: memberData.created_at,
          updated_at: memberData.updated_at
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...contract,
        member
      }
    })
  } catch (error) {
    console.error("[Contracts] Get contract error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractsService = ContractsService.getInstance()

    const body = await request.json()

    const contract = await contractsService.getContract(id)

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      )
    }

    const updatedContract = await contractsService.updateContract(id, body)

    return NextResponse.json({
      success: true,
      data: updatedContract
    })
  } catch (error) {
    console.error("[Contracts] Update contract error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const contractsService = ContractsService.getInstance()

    const { searchParams } = new URL(request.url)
    const reason = searchParams.get("reason") || undefined

    const contract = await contractsService.getContract(id)

    if (!contract) {
      return NextResponse.json(
        { success: false, error: "Contract not found" },
        { status: 404 }
      )
    }

    const success = await contractsService.cancelContract(id, reason)

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Failed to cancel contract" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Contract cancelled successfully"
    })
  } catch (error) {
    console.error("[Contracts] Cancel contract error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
