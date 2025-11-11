import { NextRequest, NextResponse } from "next/server"
import MondaySyncManager from "@/lib/monday/sync-manager"

export async function GET() {
  try {
    // Test Monday connection
    const isConnected = await MondaySyncManager.validateConnection()
    
    if (!isConnected) {
      return NextResponse.json({
        success: false,
        error: "Cannot connect to Monday.com API"
      }, { status: 503 })
    }
    
    return NextResponse.json({
      success: true,
      message: "Monday.com connection is active",
      syncInProgress: MondaySyncManager.isSyncInProgress()
    })
  } catch (error) {
    console.error("Monday sync status error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = "bidirectional", memberId } = body
    
    // Check if sync is already in progress
    if (MondaySyncManager.isSyncInProgress()) {
      return NextResponse.json({
        success: false,
        error: "Sync already in progress"
      }, { status: 409 })
    }
    
    let result
    
    switch (type) {
      case "single":
        if (!memberId) {
          return NextResponse.json({
            success: false,
            error: "Member ID is required for single sync"
          }, { status: 400 })
        }
        result = await MondaySyncManager.syncMemberToMonday(memberId)
        break
        
      case "to_monday":
        result = await MondaySyncManager.syncPendingToMonday()
        break
        
      case "from_monday":
        result = await MondaySyncManager.fullSyncFromMonday()
        break
        
      case "bidirectional":
      default:
        result = await MondaySyncManager.performBidirectionalSync()
        break
    }
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error("Monday sync error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}