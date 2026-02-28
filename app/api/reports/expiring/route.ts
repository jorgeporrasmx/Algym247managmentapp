import { type NextRequest, NextResponse } from "next/server"
import ContractsService from "@/lib/firebase/contracts-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get("days") || "30")
    const pageLimit = parseInt(searchParams.get("limit") || "100")

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + days)
    const today = new Date()

    // Get all active contracts
    const { contracts } = await ContractsService.listContracts({
      pageSize: 500,
      status: 'active'
    })

    // Filter contracts expiring within the specified days
    const expiringContracts = contracts.filter(contract => {
      if (!contract.end_date) return false
      const contractEnd = new Date(contract.end_date as string)
      return contractEnd >= today && contractEnd <= endDate
    }).slice(0, pageLimit)

    // Process the data
    const processedData = expiringContracts.map(contract => {
      const contractEnd = new Date(contract.end_date as string)
      const daysUntilExpiry = Math.ceil((contractEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      return {
        contract_id: contract.id,
        contract_type: contract.contract_type,
        end_date: contract.end_date,
        days_until_expiry: daysUntilExpiry,
        monthly_fee: contract.monthly_fee,
        member: {
          id: contract.member_id,
          name: contract.member_name || 'Unknown',
          email: contract.member_email || '',
        },
        renewal_priority: daysUntilExpiry <= 3 ? 'high' : daysUntilExpiry <= 7 ? 'medium' : 'low'
      }
    })

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

    return NextResponse.json({
      success: true,
      data: {
        summary,
        members: processedData,
        query_params: {
          days,
          limit: pageLimit,
          generated_at: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error("[Firebase] Expiring members report API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
