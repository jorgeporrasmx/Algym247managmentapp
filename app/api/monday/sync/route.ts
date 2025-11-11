import { NextRequest } from "next/server"
import { MondayAPIService } from "@/lib/monday-api"

export async function GET() {
  try {
    const mondayService = MondayAPIService.getInstance()
    
    // Test connection and get board structure
    const boardData = await mondayService.getBoardStructure()
    const itemsData = await mondayService.getBoardItems()
    
    return Response.json({ 
      success: true, 
      message: "Successfully connected to Monday.com",
      board: boardData.boards[0],
      columns: boardData.boards[0]?.columns || [],
      items_count: itemsData.boards[0]?.items_page?.items?.length || 0,
      items: itemsData.boards[0]?.items_page?.items || []
    })
  } catch (error) {
    console.error("Monday sync error:", error)
    return Response.json({ 
      success: false, 
      error: "Failed to connect to Monday.com",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const mondayService = MondayAPIService.getInstance()
    
    // Force sync with Monday
    await mondayService.syncWithMonday()
    
    // Get fresh product data
    const products = await mondayService.getProducts()
    
    return Response.json({ 
      success: true, 
      message: "Monday sync completed",
      products_count: products.length,
      products: products
    })
  } catch (error) {
    console.error("Monday sync error:", error)
    return Response.json({ 
      success: false, 
      error: "Failed to sync with Monday.com",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}