import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"
import bcrypt from "bcryptjs"

interface EmployeeData {
  id: string
  name: string
  email: string
  position: string
  department: string
  access_level: string
}

interface LoginCredentials {
  id: string
  username: string
  password_hash: string
  employee_type: string
  is_active: boolean
  last_login: string | null
  employees: EmployeeData
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({ 
        success: false, 
        error: "Username and password are required" 
      }, { status: 400 })
    }

    // Find employee login credentials
    const { data: loginCredentials, error } = await supabase
      .from("employee_login_credentials")
      .select(`
        id,
        username,
        password_hash,
        employee_type,
        is_active,
        last_login,
        employees (
          id,
          name,
          email,
          position,
          department,
          access_level
        )
      `)
      .eq("username", username)
      .eq("is_active", true)
      .single() as { data: LoginCredentials | null; error: Error | null }

    if (error || !loginCredentials) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid credentials" 
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, loginCredentials.password_hash)
    
    if (!isValidPassword) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid credentials" 
      }, { status: 401 })
    }

    // Update last login time
    await supabase
      .from("employee_login_credentials")
      .update({ last_login: new Date().toISOString() })
      .eq("id", loginCredentials.id)

    // Return employee data (without password hash)
    const employeeData = {
      id: loginCredentials.employees.id,
      name: loginCredentials.employees.name,
      email: loginCredentials.employees.email,
      position: loginCredentials.employees.position,
      department: loginCredentials.employees.department,
      access_level: loginCredentials.employees.access_level,
      employee_type: loginCredentials.employee_type,
      username: loginCredentials.username,
      last_login: loginCredentials.last_login
    }

    return NextResponse.json({
      success: true,
      data: employeeData,
    })
  } catch (error) {
    console.error("[v0] Employee authentication API error:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Internal server error" 
    }, { status: 500 })
  }
}
