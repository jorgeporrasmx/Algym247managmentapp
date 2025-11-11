import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

interface MemberData {
  id: string
  monday_member_id: string
  name: string
  email: string
  phone: string
  status: string
  created_at: string
  updated_at: string
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

interface SupabaseError extends Error {
  code?: string
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: contract, error } = await supabase
      .from("contracts")
      .select(`
        *,
        members (
          id,
          monday_member_id,
          name,
          email,
          phone,
          status,
          created_at,
          updated_at
        )
      `)
      .eq("id", id)
      .single() as { data: ContractWithMember | null; error: SupabaseError | null }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 })
      }

      console.error("[v0] Error fetching contract:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch contract" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: contract,
    })
  } catch (error) {
    console.error("[v0] Contract detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
