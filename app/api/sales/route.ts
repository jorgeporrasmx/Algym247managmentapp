import { createClient } from "@/lib/server"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { items, total, customer, payment_method, payment_details, member_id } = await request.json()

    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isSupabaseConfigured = supabaseUrl && 
      supabaseUrl !== 'https://your-project.supabase.co' &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-anon-key-here'

    if (!isSupabaseConfigured) {
      // Return mock success for development
      const mockSale = {
        id: "sale_" + Date.now(),
        items,
        total,
        customer,
        payment_method,
        payment_details,
        member_id,
        status: "completed",
        created_at: new Date().toISOString(),
        transaction_id: "txn_" + Math.random().toString(36).substr(2, 9)
      }
      
      console.log("Mock sale created:", mockSale)
      return Response.json({ success: true, sale: mockSale, id: mockSale.id })
    }

    const supabase = await createClient()

    // Create the main sale record
    const saleData = {
      total_amount: total,
      payment_method,
      payment_status: "completed",
      customer_name: customer?.name || "Cliente General",
      customer_email: customer?.email || null,
      customer_phone: customer?.phone || null,
      customer_address: customer?.address || null,
      member_id: member_id || null,
      transaction_id: "txn_" + Math.random().toString(36).substr(2, 9),
      payment_details: payment_details ? JSON.stringify(payment_details) : null
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert([saleData])
      .select()
      .single()

    if (saleError) {
      console.error("Error creating sale:", saleError)
      return Response.json({ error: "Failed to create sale", details: saleError.message }, { status: 500 })
    }

    // Create sale items
    const saleItems = items.map((item: { product_id: string; name: string; quantity: number; price: number }) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from("sale_items")
      .insert(saleItems)

    if (itemsError) {
      console.error("Error creating sale items:", itemsError)
      // Try to rollback the sale
      await supabase.from("sales").delete().eq("id", sale.id)
      return Response.json({ error: "Failed to create sale items", details: itemsError.message }, { status: 500 })
    }

    // Update product stock
    for (const item of items) {
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("stock")
        .eq("product_id", item.product_id)
        .single()

      if (!productError && product) {
        const newStock = Math.max(0, (parseInt(product.stock) || 0) - item.quantity)
        await supabase
          .from("products")
          .update({ stock: newStock.toString() })
          .eq("product_id", item.product_id)
      }
    }

    return Response.json({ 
      success: true, 
      sale, 
      id: sale.id,
      message: "Sale completed successfully" 
    })

  } catch (error) {
    console.error("Error processing sale:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const isSupabaseConfigured = supabaseUrl && 
      supabaseUrl !== 'https://your-project.supabase.co' &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-anon-key-here'

    if (!isSupabaseConfigured) {
      // Return mock sales data for development
      const mockSales = [
        {
          id: "sale_1",
          total_amount: 299.99,
          payment_method: "card",
          payment_status: "completed",
          customer_name: "Juan Pérez",
          customer_email: "juan@email.com",
          transaction_id: "txn_abc123",
          created_at: new Date().toISOString(),
          sale_items: [
            {
              id: "item_1",
              product_name: "Proteína Whey",
              quantity: 1,
              unit_price: 299.99,
              total_price: 299.99
            }
          ]
        }
      ]
      return Response.json({ success: true, data: mockSales })
    }

    const supabase = await createClient()

    const { data: sales, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items (
          *
        )
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching sales:", error)
      return Response.json({ error: "Failed to fetch sales" }, { status: 500 })
    }

    return Response.json({ success: true, data: sales })
  } catch (error) {
    console.error("Error fetching sales:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}