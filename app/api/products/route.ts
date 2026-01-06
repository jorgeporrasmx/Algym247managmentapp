import { type NextRequest, NextResponse } from "next/server"
import { ProductsService, Product } from "@/lib/firebase/products-service"

export async function GET(request: NextRequest) {
  try {
    const productsService = ProductsService.getInstance()
    const { searchParams } = new URL(request.url)

    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Math.min(Number.parseInt(searchParams.get("limit") || "50"), 100)
    const search = searchParams.get("search") || undefined
    const category = searchParams.get("category") || undefined
    const status = searchParams.get("status") || undefined
    const lowStock = searchParams.get("low_stock") === "true"

    const { products, total } = await productsService.getProducts({
      page,
      limit,
      search,
      category,
      status,
      lowStock
    })

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[Products] API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const productsService = ProductsService.getInstance()
    const body = await request.json()

    const {
      name,
      brand,
      type,
      category,
      description,
      supplier,
      supplier_email,
      supplier_website,
      location,
      price = 0,
      cost = 0,
      stock = 0,
      stock_minimum = 5,
      status = "active"
    } = body

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      )
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category is required" },
        { status: 400 }
      )
    }

    const productData: Omit<Product, 'id' | 'product_id' | 'created_at' | 'updated_at'> = {
      name,
      brand,
      type,
      category,
      description,
      supplier,
      supplier_email,
      supplier_website,
      location,
      price: Number(price),
      cost: cost ? Number(cost) : undefined,
      stock: Number(stock),
      stock_minimum: Number(stock_minimum),
      status: status as Product['status']
    }

    const product = await productsService.createProduct(productData)

    console.log("[Products] Created new product:", product)

    return NextResponse.json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error("[Products] Create error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
