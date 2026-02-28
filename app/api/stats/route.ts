import MembersService from "@/lib/firebase/members-service"
import ContractsService from "@/lib/firebase/contracts-service"
import PaymentsService from "@/lib/firebase/payments-service"
import ScheduleService from "@/lib/firebase/schedule-service"

export async function GET() {
  try {
    // Get real stats from Firebase
    const [memberStats, contractStats, paymentStats, scheduleStats] = await Promise.all([
      MembersService.getStats(),
      ContractsService.getStats(),
      PaymentsService.getStats(),
      ScheduleService.getStats()
    ])

    const stats = {
      members: memberStats.total,
      members_active: memberStats.active,
      contracts: contractStats.total,
      contracts_active: contractStats.active,
      payments: paymentStats.total,
      payments_revenue: paymentStats.totalRevenue,
      schedule: scheduleStats.total,
      schedule_upcoming: scheduleStats.scheduled,
      total: memberStats.total + contractStats.total + paymentStats.total + scheduleStats.total
    }

    return Response.json(stats)
  } catch (error) {
    console.error("[Firebase] Error fetching stats:", error)
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
