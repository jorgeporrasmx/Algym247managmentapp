import { type NextRequest, NextResponse } from "next/server"
import PaymentsService from "@/lib/firebase/payments-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get("days") || "30")
    const pageLimit = parseInt(searchParams.get("limit") || "100")
    const today = new Date()

    // Get pending and failed payments
    const [pendingResult, failedResult] = await Promise.all([
      PaymentsService.listPayments({ status: 'pending', pageSize: 500 }),
      PaymentsService.listPayments({ status: 'failed', pageSize: 500 })
    ])

    const allPayments = [...pendingResult.payments, ...failedResult.payments]

    // Filter overdue payments
    const overduePayments = allPayments.filter(payment => {
      if (!payment.payment_date) return false
      const dueDate = new Date(payment.payment_date as string)
      return dueDate <= today
    }).slice(0, pageLimit)

    // Process the data
    const processedData = overduePayments.map(payment => {
      const dueDate = new Date(payment.payment_date as string)
      const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      return {
        payment_id: payment.id,
        payment_reference: payment.transaction_id,
        amount: payment.amount,
        payment_type: payment.contract_type || 'membership',
        status: payment.status,
        due_date: payment.payment_date,
        days_overdue: daysOverdue,
        member: {
          id: payment.member_id,
          name: payment.member_name || 'Unknown',
          email: payment.member_email || '',
        },
        collection_priority: daysOverdue >= 15 ? 'high' : daysOverdue >= 7 ? 'medium' : 'low'
      }
    })

    const summary = {
      total_overdue: processedData.length,
      high_priority: processedData.filter(item => item.collection_priority === 'high').length,
      medium_priority: processedData.filter(item => item.collection_priority === 'medium').length,
      low_priority: processedData.filter(item => item.collection_priority === 'low').length,
      total_amount_overdue: processedData.reduce((sum, item) => sum + (item.amount || 0), 0),
      average_days_overdue: processedData.length > 0
        ? Math.round(processedData.reduce((sum, item) => sum + item.days_overdue, 0) / processedData.length)
        : 0
    }

    return NextResponse.json({
      success: true,
      data: {
        summary,
        payments: processedData,
        query_params: {
          days,
          limit: pageLimit,
          generated_at: new Date().toISOString()
        }
      }
    })
  } catch (error) {
    console.error("[Firebase] Overdue payments report API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
