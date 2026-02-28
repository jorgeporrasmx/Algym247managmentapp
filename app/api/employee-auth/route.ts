import { type NextRequest, NextResponse } from "next/server"
import FirebaseEmployeesService from "@/lib/firebase/employees-service"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: "Username and password are required"
      }, { status: 400 })
    }

    // Find employee by username in Firebase
    const employee = await FirebaseEmployeesService.getEmployeeByUsername(username)

    if (!employee) {
      return NextResponse.json({
        success: false,
        error: "Invalid credentials"
      }, { status: 401 })
    }

    // Verify password
    if (!employee.password_hash) {
      return NextResponse.json({
        success: false,
        error: "Employee account not set up for login"
      }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, employee.password_hash)

    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: "Invalid credentials"
      }, { status: 401 })
    }

    // Update last login
    if (employee.id) {
      await FirebaseEmployeesService.updateLastLogin(employee.id)
    }

    // Return employee data (without password hash)
    const employeeData = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department,
      access_level: employee.access_level,
      employee_id: employee.employee_id,
      username: employee.username,
      last_login: employee.last_login
    }

    return NextResponse.json({
      success: true,
      data: employeeData,
    })
  } catch (error) {
    console.error("[Firebase] Employee authentication API error:", error)
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 })
  }
}
