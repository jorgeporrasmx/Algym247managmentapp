import { type NextRequest, NextResponse } from "next/server"
import { EmployeesService } from "@/lib/firebase/employees-service"
import { EmployeeAuthService } from "@/lib/firebase/employee-auth"
import { AccessLevel } from "@/lib/permissions"

// Initial employees data (6 mock employees)
const INITIAL_EMPLOYEES = [
  {
    employee_id: "EMP001",
    name: "Ana García Rodríguez",
    first_name: "Ana",
    paternal_last_name: "García",
    maternal_last_name: "Rodríguez",
    email: "ana.garcia@algym247.com",
    primary_phone: "+52 55 1234 5678",
    secondary_phone: "+52 55 8765 4321",
    position: "Director General",
    department: "Dirección",
    status: "active" as const,
    hire_date: new Date("2023-01-15"),
    date_of_birth: new Date("1985-03-22"),
    address_1: "Av. Insurgentes Sur 1234",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "03100",
    emergency_contact_name: "Carlos García",
    emergency_contact_phone: "+52 55 9999 8888",
    salary: 45000,
    access_level: AccessLevel.DIRECCION,
    manager: undefined,
    work_schedule: "Lunes a Viernes 8:00-18:00",
    skills: "Administración, Liderazgo, Finanzas",
    certifications: "MBA, Certificación en Fitness",
    notes: "Director General con 5 años de experiencia en la industria del fitness",
    version: "1.0"
  },
  {
    employee_id: "EMP002",
    name: "Carlos López Martínez",
    first_name: "Carlos",
    paternal_last_name: "López",
    maternal_last_name: "Martínez",
    email: "carlos.lopez@algym247.com",
    primary_phone: "+52 55 2345 6789",
    position: "Gerente de Operaciones",
    department: "Gerencia",
    status: "active" as const,
    hire_date: new Date("2023-03-01"),
    date_of_birth: new Date("1990-07-14"),
    address_1: "Calle Reforma 567",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06600",
    emergency_contact_name: "María López",
    emergency_contact_phone: "+52 55 7777 6666",
    salary: 35000,
    access_level: AccessLevel.GERENTE,
    manager: "EMP001",
    work_schedule: "Lunes a Sábado 6:00-14:00",
    skills: "Gestión de equipos, Operaciones, Atención al cliente",
    certifications: "Certificación en Gestión de Gimnasios",
    notes: "Gerente con experiencia en operaciones y gestión de equipos",
    version: "1.0"
  },
  {
    employee_id: "EMP003",
    name: "María Fernanda Silva Torres",
    first_name: "María Fernanda",
    paternal_last_name: "Silva",
    maternal_last_name: "Torres",
    email: "maria.silva@algym247.com",
    primary_phone: "+52 55 3456 7890",
    position: "Recepcionista",
    department: "Atención al Cliente",
    status: "active" as const,
    hire_date: new Date("2023-06-15"),
    date_of_birth: new Date("1995-11-08"),
    address_1: "Col. Roma Norte 890",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06700",
    emergency_contact_name: "Ana Silva",
    emergency_contact_phone: "+52 55 5555 4444",
    salary: 18000,
    access_level: AccessLevel.RECEPCIONISTA,
    manager: "EMP002",
    work_schedule: "Lunes a Domingo 6:00-14:00 (turnos rotativos)",
    skills: "Atención al Cliente, Ventas, Sistemas POS",
    certifications: "Atención al Cliente",
    notes: "Excelente atención al cliente, manejo de múltiples idiomas",
    version: "1.0"
  },
  {
    employee_id: "EMP004",
    name: "Roberto Jiménez Pérez",
    first_name: "Roberto",
    paternal_last_name: "Jiménez",
    maternal_last_name: "Pérez",
    email: "roberto.jimenez@algym247.com",
    primary_phone: "+52 55 4567 8901",
    position: "Especialista en Ventas",
    department: "Ventas",
    status: "active" as const,
    hire_date: new Date("2023-08-01"),
    date_of_birth: new Date("1988-02-19"),
    address_1: "Av. Universidad 432",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "04510",
    emergency_contact_name: "Laura Jiménez",
    emergency_contact_phone: "+52 55 3333 2222",
    salary: 22000,
    access_level: AccessLevel.VENTAS,
    manager: "EMP002",
    work_schedule: "Lunes a Sábado 9:00-18:00",
    skills: "Ventas, Atención al Cliente, CRM",
    certifications: "Técnicas de Ventas, Atención al Cliente",
    notes: "Especialista en ventas de membresías y productos",
    version: "1.0"
  },
  {
    employee_id: "EMP005",
    name: "Lucía Hernández Gómez",
    first_name: "Lucía",
    paternal_last_name: "Hernández",
    maternal_last_name: "Gómez",
    email: "lucia.hernandez@algym247.com",
    primary_phone: "+52 55 5678 9012",
    position: "Recepcionista Principal",
    department: "Atención al Cliente",
    status: "active" as const,
    hire_date: new Date("2023-09-15"),
    date_of_birth: new Date("1992-12-03"),
    address_1: "Col. Doctores 123",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06720",
    emergency_contact_name: "Pedro Hernández",
    emergency_contact_phone: "+52 55 1111 0000",
    salary: 18000,
    access_level: AccessLevel.RECEPCIONISTA,
    manager: "EMP002",
    work_schedule: "Lunes a Domingo 14:00-22:00 (turnos vespertinos)",
    skills: "Atención al Cliente, Manejo de sistemas, Primeros auxilios",
    certifications: "Atención al Cliente, Primeros Auxilios",
    notes: "Recepcionista con experiencia en horario vespertino",
    version: "1.0"
  },
  {
    employee_id: "EMP006",
    name: "Diego Martín Ruiz",
    first_name: "Diego",
    paternal_last_name: "Martín",
    maternal_last_name: "Ruiz",
    email: "diego.martin@algym247.com",
    primary_phone: "+52 55 6789 0123",
    position: "Entrenador Personal Senior",
    department: "Entrenamiento",
    status: "active" as const,
    hire_date: new Date("2023-04-10"),
    date_of_birth: new Date("1987-09-25"),
    address_1: "Col. Condesa 678",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06140",
    emergency_contact_name: "Carmen Ruiz",
    emergency_contact_phone: "+52 55 9999 7777",
    salary: 22000,
    access_level: AccessLevel.ENTRENADOR,
    manager: "EMP002",
    work_schedule: "Lunes a Sábado 6:00-14:00 y 16:00-20:00",
    skills: "Entrenamiento Personal, Crossfit, Funcional",
    certifications: "NSCA-CPT, Certificación Crossfit Level 1",
    notes: "Entrenador personal especializado en acondicionamiento físico",
    version: "1.0"
  }
]

// Default password for initial employees - loaded from environment variable
// Should be changed after first login
function getDefaultPassword(): string {
  const envPassword = process.env.DEFAULT_SEED_PASSWORD
  if (!envPassword) {
    throw new Error("DEFAULT_SEED_PASSWORD environment variable is required for seeding employees")
  }
  return envPassword
}

// POST /api/seed/employees - Seed initial employees
export async function POST(request: NextRequest) {
  try {
    // Security: Only allow in development or with secret key
    const { searchParams } = new URL(request.url)
    const seedKey = searchParams.get("key")
    const expectedKey = process.env.SEED_SECRET_KEY

    const isProduction = process.env.NODE_ENV === 'production'
    const hasValidKey = expectedKey && seedKey === expectedKey

    if (isProduction && !hasValidKey) {
      return NextResponse.json({
        success: false,
        error: "Seed endpoint is disabled in production. Use SEED_SECRET_KEY to enable."
      }, { status: 403 })
    }

    const force = searchParams.get("force") === "true"
    const withCredentials = searchParams.get("credentials") !== "false"

    const employeesService = EmployeesService.getInstance()
    const authService = EmployeeAuthService.getInstance()

    // Check if employees already exist
    const existingResult = await employeesService.getEmployees({ limit: 1 })

    if (existingResult.total > 0 && !force) {
      return NextResponse.json({
        success: false,
        error: "Employees already exist. Use ?force=true to override.",
        existingCount: existingResult.total
      }, { status: 400 })
    }

    const results = {
      created: [] as string[],
      skipped: [] as string[],
      errors: [] as { employee_id: string; error: string }[],
      credentialsCreated: [] as string[],
      credentialsErrors: [] as { employee_id: string; error: string }[]
    }

    // Create each employee
    for (const employeeData of INITIAL_EMPLOYEES) {
      try {
        // Check if employee with this employee_id already exists
        const existing = await employeesService.getEmployeeByEmployeeId(employeeData.employee_id)

        if (existing) {
          results.skipped.push(employeeData.employee_id)
          continue
        }

        // Create employee
        const employee = await employeesService.createEmployee(employeeData)
        results.created.push(employeeData.employee_id)

        // Create login credentials if requested
        if (withCredentials && employee.id) {
          const credResult = await authService.createCredentials(employee.id, getDefaultPassword())
          if (credResult.success) {
            results.credentialsCreated.push(employeeData.employee_id)
          } else {
            results.credentialsErrors.push({
              employee_id: employeeData.employee_id,
              error: credResult.error || 'Unknown error'
            })
          }
        }
      } catch (error) {
        results.errors.push({
          employee_id: employeeData.employee_id,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log("[Seed] Employees seeded:", results)

    // Log password only in development (never expose in response)
    if (withCredentials && process.env.NODE_ENV !== 'production') {
      console.log("[Seed] Default password for seeded employees: Check DEFAULT_SEED_PASSWORD env var")
    }

    return NextResponse.json({
      success: true,
      message: "Seed completed",
      results,
      note: withCredentials ? "Credentials created. Check server logs for default password in development mode only." : undefined
    })
  } catch (error) {
    console.error("[Seed] Error seeding employees:", error)
    return NextResponse.json(
      { success: false, error: "Failed to seed employees" },
      { status: 500 }
    )
  }
}

// GET /api/seed/employees - Get seed status
export async function GET() {
  try {
    const employeesService = EmployeesService.getInstance()
    const result = await employeesService.getEmployees({ limit: 100 })

    const expectedIds = INITIAL_EMPLOYEES.map(e => e.employee_id)
    const existingIds = result.employees.map(e => e.employee_id)

    const status = {
      totalEmployees: result.total,
      expectedEmployees: INITIAL_EMPLOYEES.length,
      seeded: expectedIds.filter(id => existingIds.includes(id)),
      missing: expectedIds.filter(id => !existingIds.includes(id)),
      isComplete: expectedIds.every(id => existingIds.includes(id))
    }

    return NextResponse.json({
      success: true,
      data: status
    })
  } catch (error) {
    console.error("[Seed] Error checking seed status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check seed status" },
      { status: 500 }
    )
  }
}
