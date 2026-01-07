import { type NextRequest, NextResponse } from "next/server"
import { SalesService, Sale, SaleItem } from "@/lib/firebase/sales-service"
import { ProductsService } from "@/lib/firebase/products-service"
import { MembersService } from "@/lib/firebase/members-service"
import { getAuthenticatedUser, requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    // Require authentication to view sales
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const salesService = SalesService.getInstance()
    const membersService = MembersService.getInstance()

    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const paymentMethod = searchParams.get("payment_method") || undefined
    const paymentStatus = searchParams.get("payment_status") || undefined
    const memberId = searchParams.get("member_id") || undefined

    const { sales, total } = await salesService.getSales({
      page,
      limit,
      paymentMethod,
      paymentStatus,
      memberId
    })

    // Enrich sales with member data
    const salesWithDetails = await Promise.all(
      sales.map(async (sale) => {
        let member = null
        if (sale.member_id) {
          const memberData = await membersService.getMember(sale.member_id)
          if (memberData) {
            member = {
              id: memberData.id,
              name: memberData.name || `${memberData.first_name} ${memberData.paternal_last_name}`,
              email: memberData.email
            }
          }
        }
        return {
          ...sale,
          member,
          // Keep sale_items format for backwards compatibility
          sale_items: sale.items.map(item => ({
            id: `${sale.id}_${item.product_id}`,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          }))
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: salesWithDetails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Sales] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication to create sales
    const authCheck = await requireAnyPermission(request, [
      Permission.VIEW_ALL_MEMBERS,
      Permission.MANAGE_ALL_EMPLOYEES
    ])

    if (!authCheck.authorized) {
      return authCheck.response!
    }

    const salesService = SalesService.getInstance()
    const productsService = ProductsService.getInstance()

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({
        success: false,
        error: "Invalid JSON in request body"
      }, { status: 400 })
    }

    const {
      items,
      total,
      customer,
      payment_method,
      payment_details,
      member_id,
      employee_id,
      employee_name,
      sale_type = 'product',
      notes
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items are required" },
        { status: 400 }
      )
    }

    if (!payment_method) {
      return NextResponse.json(
        { success: false, error: "Payment method is required" },
        { status: 400 }
      )
    }

    // Map items to SaleItem format
    const saleItems: SaleItem[] = items.map((item: any) => ({
      product_id: item.product_id || item.id,
      product_name: item.name || item.product_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.price || item.unit_price),
      total_price: Number(item.quantity) * Number(item.price || item.unit_price)
    }))

    // Calculate total
    const calculatedTotal = saleItems.reduce((sum, item) => sum + item.total_price, 0)

    // Create sale data
    const saleData: Omit<Sale, 'id' | 'sale_id' | 'transaction_id' | 'created_at' | 'updated_at'> = {
      items: saleItems,
      total_amount: total || calculatedTotal,
      customer_name: customer?.name || 'Cliente General',
      customer_email: customer?.email,
      customer_phone: customer?.phone,
      customer_address: customer?.address,
      member_id,
      payment_method: payment_method as Sale['payment_method'],
      payment_status: 'completed',
      payment_details: payment_details ? JSON.stringify(payment_details) : undefined,
      sale_type: sale_type as Sale['sale_type'],
      employee_id,
      employee_name,
      notes
    }

    // Create the sale
    const sale = await salesService.createSale(saleData)

    // Update product stock for each item
    for (const item of saleItems) {
      try {
        // Try to find product by product_id field first
        let product = await productsService.getProductByProductId(item.product_id)

        // If not found, try by document ID
        if (!product) {
          product = await productsService.getProduct(item.product_id)
        }

        if (product && product.id) {
          await productsService.updateStock(product.id, item.quantity, 'subtract')
        }
      } catch (stockError) {
        console.warn(`[Sales] Could not update stock for product ${item.product_id}:`, stockError)
        // Don't fail the sale if stock update fails
      }
    }

    console.log("[Sales] Created new sale:", sale)

    return NextResponse.json({
      success: true,
      sale,
      id: sale.id,
      message: "Sale completed successfully"
    })
  } catch (error) {
    console.error("[Sales] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
