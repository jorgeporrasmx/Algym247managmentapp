import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      employee_id,
      username,
      password,
      employee_type
    } = body

    if (!employee_id || !username || !password || !employee_type) {
      return NextResponse.json({ 
        success: false, 
        error: "All fields are required" 
      }, { status: 400 })
    }

    if (!['A', 'B'].includes(employee_type)) {
      return NextResponse.json({ 
        success: false, 
        error: "Employee type must be A or B" 
      }, { status: 400 })
    }

    // Check if employee exists
    const { data: employee, error: employeeError } = await supabase
      .from("employees")
      .select("id, name, email")
      .eq("id", employee_id)
      .single()

    if (employeeError || !employee) {
      return NextResponse.json({ 
        success: false, 
        error: "Employee not found" 
      }, { status: 404 })
    }

    // Check if username already exists
    const { data: existingLogin } = await supabase
      .from("employee_login_credentials")
      .select("id")
      .eq("username", username)
      .single()

    if (existingLogin) {
      return NextResponse.json({ 
        success: false, 
        error: "Username already exists" 
      }, { status: 400 })
    }

    // Hash the password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Create login credentials
    const { data: loginCredentials, error } = await supabase
      .from("employee_login_credentials")
      .insert({
        employee_id,
        username,
        password_hash: passwordHash,
        employee_type,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating employee login:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to create login credentials" 
      }, { status: 500 })
    }

    console.log("[v0] Created employee login credentials:", loginCredentials)

    return NextResponse.json({
      success: true,
      data: {
        id: loginCredentials.id,
        username: loginCredentials.username,
        employee_type: loginCredentials.employee_type,
        employee_name: employee.name,
        employee_email: employee.email
      },
    })
  } catch (error) {
    console.error("[v0] Create employee login API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const employee_id = searchParams.get("employee_id")

    let query = supabase
      .from("employee_login_credentials")
      .select(`
        id,
        username,
        employee_type,
        is_active,
        last_login,
        created_at,
        employees (
          id,
          name,
          email,
          position
        )
      `)

    if (employee_id) {
      query = query.eq("employee_id", employee_id)
    }

    const { data: loginCredentials, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching employee login credentials:", error)
      return NextResponse.json({ 
        success: false, 
        error: "Failed to fetch login credentials" 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: loginCredentials,
    })
  } catch (error) {
    console.error("[v0] Fetch employee login API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
