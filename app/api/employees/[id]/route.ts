import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/server"

interface SupabaseError extends Error {
  code?: string
}

interface Employee {
  id: string
  name: string
  position: string
  status: string
  hire_date: string
  paternal_last_name: string
  maternal_last_name: string
  first_name: string
  date_of_birth: string
  email: string
  primary_phone: string
  address_1: string
  city: string
  state: string
  zip_code: string
  secondary_phone: string
  emergency_contact_name: string
  emergency_contact_phone: string
  department: string
  employee_id: string
  salary: number
  access_level: string
  manager: string
  work_schedule: string
  skills: string
  certifications: string
  notes: string
  version: string
  created_at: string
  updated_at: string
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: employee, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", id)
      .single() as { data: Employee | null; error: SupabaseError | null }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
      }

      console.error("[v0] Error fetching employee:", error)
      return NextResponse.json({ success: false, error: "Failed to fetch employee" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[v0] Employee detail API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      position,
      status,
      hire_date,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth,
      email,
      primary_phone,
      address_1,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      employee_id,
      salary,
      access_level,
      manager,
      work_schedule,
      skills,
      certifications,
      notes,
      version
    } = body

    // Prepare the employee data with all fields
    const employeeData = {
      name: name || `${first_name} ${paternal_last_name}`.trim(),
      position,
      status,
      hire_date: hire_date || null,
      paternal_last_name,
      maternal_last_name,
      first_name,
      date_of_birth: date_of_birth || null,
      email,
      primary_phone,
      address_1,
      city,
      state,
      zip_code,
      secondary_phone,
      emergency_contact_name,
      emergency_contact_phone,
      department,
      employee_id,
      salary: salary ? parseFloat(salary) : null,
      access_level,
      manager,
      work_schedule,
      skills,
      certifications,
      notes,
      version
    }

    const { data: employee, error } = await supabase
      .from("employees")
      .update(employeeData)
      .eq("id", id)
      .select()
      .single() as { data: Employee | null; error: SupabaseError | null }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
      }

      console.error("[v0] Error updating employee:", error)
      return NextResponse.json({ success: false, error: "Failed to update employee" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: employee,
    })
  } catch (error) {
    console.error("[v0] Update employee API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from("employees")
      .delete()
      .eq("id", id) as { error: SupabaseError | null }

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Employee not found" }, { status: 404 })
      }

      console.error("[v0] Error deleting employee:", error)
      return NextResponse.json({ success: false, error: "Failed to delete employee" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    })
  } catch (error) {
    console.error("[v0] Delete employee API error:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
