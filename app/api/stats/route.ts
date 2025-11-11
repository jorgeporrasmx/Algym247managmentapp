import { createClient } from "@/lib/server"

export async function GET() {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isSupabaseConfigured = supabaseUrl && 
      supabaseUrl !== 'https://your-project.supabase.co' &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-anon-key-here'

    if (!isSupabaseConfigured) {
      // Return mock data for development
      const mockStats = {
        members: 127,
        contracts: 98,
        payments: 256,
        schedule: 15,
        total: 496
      }
      return Response.json(mockStats)
    }

    // Use real Supabase data
    const supabase = await createClient()
    
    // Get counts for all tables
    const [membersResult, contractsResult, paymentsResult, scheduleResult] = await Promise.all([
      supabase.from("members").select("*", { count: "exact", head: true }),
      supabase.from("contracts").select("*", { count: "exact", head: true }),
      supabase.from("payments").select("*", { count: "exact", head: true }),
      supabase.from("schedule").select("*", { count: "exact", head: true })
    ])

    const stats = {
      members: membersResult.count || 0,
      contracts: contractsResult.count || 0,
      payments: paymentsResult.count || 0,
      schedule: scheduleResult.count || 0,
      total: (membersResult.count || 0) + (contractsResult.count || 0) + (paymentsResult.count || 0) + (scheduleResult.count || 0)
    }

    return Response.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return Response.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
