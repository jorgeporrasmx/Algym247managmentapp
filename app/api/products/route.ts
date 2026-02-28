import { NextResponse } from "next/server"
import { MondayAPIService } from "@/lib/monday-api"

export async function GET() {
  try {
    const mondayService = MondayAPIService.getInstance()
    const products = await mondayService.getProducts()

    return NextResponse.json({
      success: true,
      data: products,
    })
  } catch (error) {
    console.error("[Monday] Products API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
