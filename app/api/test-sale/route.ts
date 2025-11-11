import { NextRequest, NextResponse } from "next/server"
import { GoogleSheetsService } from "@/lib/google-sheets"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity = 1 } = body

    if (!productId) {
      return NextResponse.json({ success: false, error: "Product ID required" }, { status: 400 })
    }

    const sheetsService = GoogleSheetsService.getInstance()
    
    // Get product details
    const products = await sheetsService.getProducts()
    const product = products.find(p => p.id === productId)
    
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 })
    }

    if (product.stock < quantity) {
      return NextResponse.json({ 
        success: false, 
        error: `Insufficient stock. Only ${product.stock} available.` 
      }, { status: 400 })
    }

    // Record the sale
    const sale = await sheetsService.addSale({
      date: new Date().toISOString().split('T')[0],
      product_id: product.id,
      product_name: product.name,
      quantity: quantity,
      unit_price: product.price,
      total: product.price * quantity,
      payment_method: "cash",
      sale_type: "product",
      employee: "Test API"
    })

    // Get updated product info
    const updatedProducts = await sheetsService.getProducts()
    const updatedProduct = updatedProducts.find(p => p.id === productId)

    return NextResponse.json({
      success: true,
      sale,
      product: {
        before: { name: product.name, stock: product.stock },
        after: { name: updatedProduct?.name, stock: updatedProduct?.stock }
      }
    })

  } catch (error) {
    console.error("Test sale error:", error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}