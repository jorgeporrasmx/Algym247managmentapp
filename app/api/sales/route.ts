import { type NextRequest, NextResponse } from "next/server"
import { MondayAPIService } from "@/lib/monday-api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      product_id,
      product_name,
      quantity,
      unit_price,
      total,
      payment_method,
      sale_type,
      employee,
      date
    } = body

    if (!product_id || !product_name || !quantity || !unit_price) {
      return NextResponse.json({
        success: false,
        error: "product_id, product_name, quantity, and unit_price are required"
      }, { status: 400 })
    }

    const mondayService = MondayAPIService.getInstance()

    const sale = await mondayService.addSale({
      product_id,
      product_name,
      quantity: Number(quantity),
      unit_price: Number(unit_price),
      total: total ? Number(total) : Number(quantity) * Number(unit_price),
      payment_method: payment_method || 'cash',
      sale_type: sale_type || 'product',
      employee: employee || '',
      date: date || new Date().toISOString().split('T')[0],
    })

    return NextResponse.json({
      success: true,
      data: sale,
    })
  } catch (error) {
    console.error("[Monday] Create sale API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
