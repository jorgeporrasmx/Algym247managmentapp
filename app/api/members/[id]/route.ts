import { type NextRequest, NextResponse } from "next/server"
import MembersService from "@/lib/firebase/members-service"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const member = await MembersService.getMember(id)

    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error) {
    console.error("[Firebase] Member detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const member = await MembersService.getMember(id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    await MembersService.updateMember(id, body)

    const updatedMember = await MembersService.getMember(id)

    return NextResponse.json({
      success: true,
      data: updatedMember,
    })
  } catch (error) {
    console.error("[Firebase] Update member API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const member = await MembersService.getMember(id)
    if (!member) {
      return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
    }

    await MembersService.deleteMember(id)

    return NextResponse.json({
      success: true,
      message: "Member deactivated successfully",
    })
  } catch (error) {
    console.error("[Firebase] Delete member API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
