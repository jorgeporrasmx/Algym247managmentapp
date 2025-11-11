import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

interface SupabaseError extends Error {
  code?: string
}

interface Contract {
  id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
  created_at: string
  updated_at: string
}

interface MemberWithContracts {
  id: string
  monday_member_id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zip_code: string
  status: string
  selected_plan: string
  monthly_amount: number
  created_at: string
  updated_at: string
  contracts: Contract[]
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: member, error } = await supabase
      .from("members")
      .select(`
        *,
        contracts (
          id,
          monday_contract_id,
          contract_type,
          start_date,
          end_date,
          monthly_fee,
          status,
          created_at,
          updated_at
        )
      `)
      .eq("id", id)
      .single() as { data: MemberWithContracts | null; error: SupabaseError | null }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 })
      }

      console.error("[v0] Error fetching member:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch member" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: member,
    })
  } catch (error) {
    console.error("[v0] Member detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
