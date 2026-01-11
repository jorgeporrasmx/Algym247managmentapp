import { type NextRequest, NextResponse } from "next/server"
import MondaySyncManager, { EntityType } from "@/lib/monday/sync-manager"
import { isMondayEnabled } from "@/lib/monday/config"

/**
 * GET /api/monday/sync
 * Get sync status and statistics
 */
export async function GET() {
  try {
    // Check if Monday integration is enabled
    if (!isMondayEnabled()) {
      return NextResponse.json({
        success: false,
        error: "Monday.com integration is not configured. Set MONDAY_API_TOKEN environment variable."
      }, { status: 503 })
    }

    // Check connection
    const isConnected = await MondaySyncManager.validateConnection()

    // Get sync stats
    const stats = await MondaySyncManager.getSyncStats()

    return NextResponse.json({
      success: true,
      connected: isConnected,
      syncInProgress: MondaySyncManager.isSyncInProgress(),
      currentEntity: MondaySyncManager.getCurrentSyncEntity(),
      stats
    })
  } catch (error) {
    console.error("[Monday Sync API] Error getting status:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get sync status"
    }, { status: 500 })
  }
}

/**
 * POST /api/monday/sync
 * Trigger synchronization
 *
 * Body options:
 * - { type: "full" } - Full bidirectional sync for all entities
 * - { type: "to_monday", entity: "members" } - Sync pending of entity to Monday
 * - { type: "from_monday", entity: "contracts" } - Pull entity from Monday
 * - { type: "single", entity: "members", id: "abc123" } - Sync single item to Monday
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Monday integration is enabled
    if (!isMondayEnabled()) {
      return NextResponse.json({
        success: false,
        error: "Monday.com integration is not configured. Set MONDAY_API_TOKEN environment variable."
      }, { status: 503 })
    }

    // Check if sync is already in progress
    if (MondaySyncManager.isSyncInProgress()) {
      return NextResponse.json({
        success: false,
        error: "Sync already in progress",
        currentEntity: MondaySyncManager.getCurrentSyncEntity()
      }, { status: 409 })
    }

    const body = await request.json()
    const { type = "full", entity, id } = body as {
      type?: "full" | "to_monday" | "from_monday" | "single"
      entity?: EntityType
      id?: string
    }

    let result

    switch (type) {
      case "full":
        // Full bidirectional sync for all entities
        console.log("[Monday Sync API] Starting full bidirectional sync...")
        result = await MondaySyncManager.performFullBidirectionalSync()
        return NextResponse.json({
          success: true,
          message: "Full bidirectional sync completed",
          type: "full",
          report: result
        })

      case "to_monday":
        // Sync pending items of specific entity to Monday
        if (!entity) {
          return NextResponse.json({
            success: false,
            error: "Entity type is required for to_monday sync"
          }, { status: 400 })
        }

        console.log(`[Monday Sync API] Syncing pending ${entity} to Monday...`)
        result = await MondaySyncManager.syncEntityToMonday(entity)
        return NextResponse.json({
          success: true,
          message: `Synced pending ${entity} to Monday`,
          type: "to_monday",
          entity,
          report: result
        })

      case "from_monday":
        // Pull all items of specific entity from Monday
        if (!entity) {
          return NextResponse.json({
            success: false,
            error: "Entity type is required for from_monday sync"
          }, { status: 400 })
        }

        console.log(`[Monday Sync API] Pulling ${entity} from Monday...`)
        result = await MondaySyncManager.syncEntityFromMonday(entity)
        return NextResponse.json({
          success: true,
          message: `Pulled ${entity} from Monday`,
          type: "from_monday",
          entity,
          report: result
        })

      case "single":
        // Sync a single item
        if (!entity || !id) {
          return NextResponse.json({
            success: false,
            error: "Entity type and ID are required for single sync"
          }, { status: 400 })
        }

        console.log(`[Monday Sync API] Syncing single ${entity} ${id} to Monday...`)

        let singleResult
        switch (entity) {
          case "members":
            singleResult = await MondaySyncManager.syncMemberToMonday(id)
            break
          case "contracts":
            singleResult = await MondaySyncManager.syncContractToMonday(id)
            break
          case "payments":
            singleResult = await MondaySyncManager.syncPaymentToMonday(id)
            break
          case "employees":
            singleResult = await MondaySyncManager.syncEmployeeToMonday(id)
            break
        }

        return NextResponse.json({
          success: singleResult.success,
          message: singleResult.success
            ? `Synced ${entity} ${id} to Monday`
            : `Failed to sync ${entity} ${id}`,
          type: "single",
          entity,
          id,
          result: singleResult
        })

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown sync type: ${type}. Use: full, to_monday, from_monday, or single`
        }, { status: 400 })
    }
  } catch (error) {
    console.error("[Monday Sync API] Error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Sync failed"
    }, { status: 500 })
  }
}
