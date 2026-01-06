import { type NextRequest, NextResponse } from "next/server"
import { MondaySyncService } from "@/lib/monday-sync-service"
import { MembersService } from "@/lib/firebase/members-service"
import { EmployeesService } from "@/lib/firebase/employees-service"
import { ContractsService } from "@/lib/firebase/contracts-service"
import { requirePermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

/**
 * POST /api/monday/sync-all
 * Sync all Firebase data to Monday.com
 * Requires MANAGE_ALL_EMPLOYEES permission
 */
export async function POST(request: NextRequest) {
  try {
    // Require high-level permission to sync
    const authCheck = await requirePermission(request, Permission.MANAGE_ALL_EMPLOYEES)

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const mondaySync = MondaySyncService.getInstance()

    // Check if Monday is configured
    if (!mondaySync.isConfigured()) {
      return NextResponse.json({
        success: false,
        error: "Monday.com API not configured. Please set MONDAY_API_TOKEN in environment variables."
      }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const entities = searchParams.get("entities")?.split(",") || ["members", "employees", "contracts"]

    const results: Record<string, any> = {}
    const errors: string[] = []

    // Sync members
    if (entities.includes("members")) {
      try {
        const membersService = MembersService.getInstance()
        const { members } = await membersService.getMembers({ limit: 500 })
        const memberResult = await mondaySync.syncMembersToMonday(members)
        results.members = memberResult
        if (!memberResult.success) {
          errors.push(...memberResult.errors)
        }
      } catch (error) {
        errors.push(`Members sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Sync employees
    if (entities.includes("employees")) {
      try {
        const employeesService = EmployeesService.getInstance()
        const { employees } = await employeesService.getEmployees({ limit: 500 })
        const employeeResult = await mondaySync.syncEmployeesToMonday(employees)
        results.employees = employeeResult
        if (!employeeResult.success) {
          errors.push(...employeeResult.errors)
        }
      } catch (error) {
        errors.push(`Employees sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Sync contracts
    if (entities.includes("contracts")) {
      try {
        const contractsService = ContractsService.getInstance()
        const { contracts } = await contractsService.getContracts({ limit: 500 })
        const contractResult = await mondaySync.syncContractsToMonday(contracts)
        results.contracts = contractResult
        if (!contractResult.success) {
          errors.push(...contractResult.errors)
        }
      } catch (error) {
        errors.push(`Contracts sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Calculate totals
    const totalSynced = Object.values(results).reduce((sum: number, r: any) => sum + (r?.synced || 0), 0)
    const totalCreated = Object.values(results).reduce((sum: number, r: any) => sum + (r?.created || 0), 0)
    const totalUpdated = Object.values(results).reduce((sum: number, r: any) => sum + (r?.updated || 0), 0)

    console.log(`[Monday Sync] Completed by ${authCheck.user?.email}: ${totalSynced} synced, ${totalCreated} created, ${totalUpdated} updated`)

    return NextResponse.json({
      success: errors.length === 0,
      message: `Sync completed: ${totalSynced} records synced (${totalCreated} created, ${totalUpdated} updated)`,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    console.error("[Monday Sync] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}

/**
 * GET /api/monday/sync-all
 * Get sync status for all Monday.com boards
 */
export async function GET(request: NextRequest) {
  try {
    // Require permission to view sync status
    const authCheck = await requirePermission(request, Permission.VIEW_EMPLOYEE_DETAILS)

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const mondaySync = MondaySyncService.getInstance()

    if (!mondaySync.isConfigured()) {
      return NextResponse.json({
        success: false,
        configured: false,
        message: "Monday.com API not configured"
      })
    }

    const status = await mondaySync.getSyncStatus()

    return NextResponse.json({
      success: true,
      ...status
    })
  } catch (error) {
    console.error("[Monday Sync Status] Error:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to get sync status"
    }, { status: 500 })
  }
}
