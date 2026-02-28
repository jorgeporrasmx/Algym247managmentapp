import { type NextRequest, NextResponse } from "next/server"
import ContractsService from "@/lib/firebase/contracts-service"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const contract = await ContractsService.getContract(id)

    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    console.error("[Firebase] Contract detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const contract = await ContractsService.getContract(id)
    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
    }

    await ContractsService.updateContract(id, body)
    const updatedContract = await ContractsService.getContract(id)

    return NextResponse.json({
      success: true,
      data: updatedContract,
    })
  } catch (error) {
    console.error("[Firebase] Update contract API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
