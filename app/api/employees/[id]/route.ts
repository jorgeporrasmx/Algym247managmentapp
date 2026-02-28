import { type NextRequest, NextResponse } from "next/server"
import FirebaseEmployeesService from "@/lib/firebase/employees-service"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const employee = await FirebaseEmployeesService.getEmployee(id)

    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[Firebase] Employee detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const employee = await FirebaseEmployeesService.getEmployee(id)
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
    }

    await FirebaseEmployeesService.updateEmployee(id, body)
    const updatedEmployee = await FirebaseEmployeesService.getEmployee(id)

    return NextResponse.json({
      success: true,
      data: updatedEmployee,
    })
  } catch (error) {
    console.error("[Firebase] Update employee API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const employee = await FirebaseEmployeesService.getEmployee(id)
    if (!employee) {
      return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
    }

    await FirebaseEmployeesService.deleteEmployee(id)

    return NextResponse.json({
      success: true,
      message: "Employee deactivated successfully",
    })
  } catch (error) {
    console.error("[Firebase] Delete employee API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
