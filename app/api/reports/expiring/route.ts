import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

interface MemberData {
  id: string
  name: string
  email: string
  primary_phone: string
  status: string
  city: string
  state: string
  selected_plan: string
  monthly_amount: number
}

interface ContractWithMember {
  id: string
  contract_type: string
  start_date: string
  end_date: string
  monthly_fee: number
  status: string
  created_at: string
  members: MemberData
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get("days") || "30")
    const limit = parseInt(searchParams.get("limit") || "100")

    // Calculate date range
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)

    console.log(`[v0] Fetching members expiring within ${days} days`)

    // Query members with contracts expiring within the specified days
    const { data: expiringMembers, error } = await supabase
      .from("contracts")
      .select(`
        id,
        contract_type,
        start_date,
        end_date,
        monthly_fee,
        status,
        created_at,
        members (
          id,
          name,
          email,
          primary_phone,
          status,
          city,
          state,
          selected_plan,
          monthly_amount
        )
      `)
      .eq("status", "active")
      .lte("end_date", endDate.toISOString().split('T')[0])
      .gte("end_date", new Date().toISOString().split('T')[0]) // Not expired yet
      .order("end_date", { ascending: true })
      .limit(limit) as { data: ContractWithMember[] | null; error: Error | null }

    if (error) {
      console.error("[v0] Error fetching expiring members:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch expiring members" 
      }, { status: 500 })
    }

    // Process the data to include calculated fields
    const processedData = expiringMembers?.map(contract => {
      const endDate = new Date(contract.end_date)
      const today = new Date()
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        contract_id: contract.id,
        contract_type: contract.contract_type,
        end_date: contract.end_date,
        days_until_expiry: daysUntilExpiry,
        monthly_fee: contract.monthly_fee,
        member: {
          id: contract.members.id,
          name: contract.members.name,
          email: contract.members.email,
          phone: contract.members.primary_phone,
          status: contract.members.status,
          location: `${contract.members.city || ''}, ${contract.members.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
          selected_plan: contract.members.selected_plan,
          monthly_amount: contract.members.monthly_amount
        },
        renewal_priority: daysUntilExpiry <= 3 ? 'high' : daysUntilExpiry <= 7 ? 'medium' : 'low'
      }
    }) || []

    // Calculate summary statistics
    const summary = {
      total_expiring: processedData.length,
      high_priority: processedData.filter(item => item.renewal_priority === 'high').length,
      medium_priority: processedData.filter(item => item.renewal_priority === 'medium').length,
      low_priority: processedData.filter(item => item.renewal_priority === 'low').length,
      total_revenue_at_risk: processedData.reduce((sum, item) => sum + (item.monthly_fee || 0), 0),
      average_days_until_expiry: processedData.length > 0 
        ? Math.round(processedData.reduce((sum, item) => sum + item.days_until_expiry, 0) / processedData.length)
        : 0
    }

    console.log("[v0] Expiring members report:", summary)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        members: processedData,
        query_params: {
          days,
          limit,
          generated_at: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error("[v0] Expiring members report API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
