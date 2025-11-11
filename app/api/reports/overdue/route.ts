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
}

interface ContractData {
  id: string
  contract_type: string
  monthly_fee: number
  end_date: string
}

interface PaymentWithMemberAndContract {
  id: string
  amount: number
  currency: string
  payment_type: string
  status: string
  due_date: string
  created_at: string
  payment_reference: string
  members: MemberData
  contracts: ContractData
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get("days") || "30")
    const limit = parseInt(searchParams.get("limit") || "100")

    // Calculate date range for overdue payments
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    console.log(`[v0] Fetching overdue payments from last ${days} days`)

    // Query overdue payments
    const { data: overduePayments, error } = await supabase
      .from("payments")
      .select(`
        id,
        amount,
        currency,
        payment_type,
        status,
        due_date,
        created_at,
        payment_reference,
        members (
          id,
          name,
          email,
          primary_phone,
          status,
          city,
          state,
          selected_plan
        ),
        contracts (
          id,
          contract_type,
          monthly_fee,
          end_date
        )
      `)
      .in("status", ["pending", "failed"])
      .lte("due_date", new Date().toISOString().split('T')[0])
      .order("due_date", { ascending: true })
      .limit(limit) as { data: PaymentWithMemberAndContract[] | null; error: Error | null }

    if (error) {
      console.error("[v0] Error fetching overdue payments:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch overdue payments" 
      }, { status: 500 })
    }

    // Process the data to include calculated fields
    const processedData = overduePayments?.map(payment => {
      const dueDate = new Date(payment.due_date)
      const today = new Date()
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        payment_id: payment.id,
        payment_reference: payment.payment_reference,
        amount: payment.amount,
        currency: payment.currency,
        payment_type: payment.payment_type,
        status: payment.status,
        due_date: payment.due_date,
        days_overdue: daysOverdue,
        member: {
          id: payment.members.id,
          name: payment.members.name,
          email: payment.members.email,
          phone: payment.members.primary_phone,
          status: payment.members.status,
          location: `${payment.members.city || ''}, ${payment.members.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
          selected_plan: payment.members.selected_plan
        },
        contract: {
          id: payment.contracts.id,
          contract_type: payment.contracts.contract_type,
          monthly_fee: payment.contracts.monthly_fee,
          end_date: payment.contracts.end_date
        },
        collection_priority: daysOverdue >= 15 ? 'high' : daysOverdue >= 7 ? 'medium' : 'low'
      }
    }) || []

    // Calculate summary statistics
    const summary = {
      total_overdue: processedData.length,
      high_priority: processedData.filter(item => item.collection_priority === 'high').length,
      medium_priority: processedData.filter(item => item.collection_priority === 'medium').length,
      low_priority: processedData.filter(item => item.collection_priority === 'low').length,
      total_amount_overdue: processedData.reduce((sum, item) => sum + (item.amount || 0), 0),
      average_days_overdue: processedData.length > 0 
        ? Math.round(processedData.reduce((sum, item) => sum + item.days_overdue, 0) / processedData.length)
        : 0,
      by_payment_type: processedData.reduce((acc, item) => {
        acc[item.payment_type] = (acc[item.payment_type] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    console.log("[v0] Overdue payments report:", summary)

    return NextResponse.json({
      success: true,
      data: {
        summary,
        payments: processedData,
        query_params: {
          days,
          limit,
          generated_at: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error("[v0] Overdue payments report API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
