import { Employee } from "@/lib/types/employees"
import { AccessLevel } from "@/lib/permissions"

export class EmployeesService {
  private static instance: EmployeesService
  private employees: Employee[] = []

  static getInstance(): EmployeesService {
    if (!EmployeesService.instance) {
      EmployeesService.instance = new EmployeesService()
      // Initialize with mock data
      EmployeesService.instance.initializeMockData()
    }
    return EmployeesService.instance
  }

  private initializeMockData() {
    this.employees = [
      {
        id: "EMP001",
        name: "Ana García Rodríguez",
        first_name: "Ana",
        paternal_last_name: "García",
        maternal_last_name: "Rodríguez",
        email: "ana.garcia@algym247.com",
        primary_phone: "+52 55 1234 5678",
        secondary_phone: "+52 55 8765 4321",
        position: "Director General",
        department: "Dirección",
        status: "active",
        hire_date: "2023-01-15",
        date_of_birth: "1985-03-22",
        address_1: "Av. Insurgentes Sur 1234",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "03100",
        emergency_contact_name: "Carlos García",
        emergency_contact_phone: "+52 55 9999 8888",
        employee_id: "GER001",
        salary: 45000,
        access_level: AccessLevel.DIRECCION,
        manager: undefined,
        work_schedule: "Lunes a Viernes 8:00-18:00",
        skills: "Administración, Liderazgo, Finanzas",
        certifications: "MBA, Certificación en Fitness",
        notes: "Gerente con 5 años de experiencia en la industria del fitness",
        version: "1.0",
        created_at: "2023-01-15T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      },
      {
        id: "EMP002",
        name: "Carlos López Martínez",
        first_name: "Carlos",
        paternal_last_name: "López",
        maternal_last_name: "Martínez",
        email: "carlos.lopez@algym247.com",
        primary_phone: "+52 55 2345 6789",
        position: "Gerente de Operaciones",
        department: "Gerencia",
        status: "active",
        hire_date: "2023-03-01",
        date_of_birth: "1990-07-14",
        address_1: "Calle Reforma 567",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "06600",
        emergency_contact_name: "María López",
        emergency_contact_phone: "+52 55 7777 6666",
        employee_id: "GER002",
        salary: 35000,
        access_level: AccessLevel.GERENTE,
        manager: "EMP001",
        work_schedule: "Lunes a Sábado 6:00-14:00",
        skills: "Entrenamiento Personal, Nutrición, Crossfit",
        certifications: "ACSM Personal Trainer, Nutrición Deportiva",
        notes: "Gerente con experiencia en operaciones y gestión de equipos",
        version: "1.0",
        created_at: "2023-03-01T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      },
      {
        id: "EMP003",
        name: "María Fernanda Silva",
        first_name: "María Fernanda",
        paternal_last_name: "Silva",
        maternal_last_name: "Torres",
        email: "maria.silva@algym247.com",
        primary_phone: "+52 55 3456 7890",
        position: "Recepcionista",
        department: "Atención al Cliente",
        status: "active",
        hire_date: "2023-06-15",
        date_of_birth: "1995-11-08",
        address_1: "Col. Roma Norte 890",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "06700",
        emergency_contact_name: "Ana Silva",
        emergency_contact_phone: "+52 55 5555 4444",
        employee_id: "REC001",
        salary: 18000,
        access_level: AccessLevel.RECEPCIONISTA,
        manager: "EMP001",
        work_schedule: "Lunes a Domingo 6:00-14:00 (turnos rotativos)",
        skills: "Atención al Cliente, Ventas, Sistemas POS",
        certifications: "Atención al Cliente",
        notes: "Excelente atención al cliente, manejo de múltiples idiomas",
        version: "1.0",
        created_at: "2023-06-15T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      },
      {
        id: "EMP004",
        name: "Roberto Jiménez Pérez",
        first_name: "Roberto",
        paternal_last_name: "Jiménez",
        maternal_last_name: "Pérez",
        email: "roberto.jimenez@algym247.com",
        primary_phone: "+52 55 4567 8901",
        position: "Especialista en Ventas",
        department: "Ventas",
        status: "active",
        hire_date: "2023-08-01",
        date_of_birth: "1988-02-19",
        address_1: "Av. Universidad 432",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "04510",
        emergency_contact_name: "Laura Jiménez",
        emergency_contact_phone: "+52 55 3333 2222",
        employee_id: "VEN001",
        salary: 22000,
        access_level: AccessLevel.VENTAS,
        manager: "EMP002",
        work_schedule: "Lunes a Sábado 9:00-18:00",
        skills: "Ventas, Atención al Cliente, CRM",
        certifications: "Técnicas de Ventas, Atención al Cliente",
        notes: "Especialista en ventas de membresías y productos",
        version: "1.0",
        created_at: "2023-08-01T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      },
      {
        id: "EMP005",
        name: "Lucía Hernández Gómez",
        first_name: "Lucía",
        paternal_last_name: "Hernández",
        maternal_last_name: "Gómez",
        email: "lucia.hernandez@algym247.com",
        primary_phone: "+52 55 5678 9012",
        position: "Recepcionista Principal",
        department: "Atención al Cliente",
        status: "active",
        hire_date: "2023-09-15",
        date_of_birth: "1992-12-03",
        address_1: "Col. Doctores 123",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "06720",
        emergency_contact_name: "Pedro Hernández",
        emergency_contact_phone: "+52 55 1111 0000",
        employee_id: "REC002",
        salary: 18000,
        access_level: AccessLevel.RECEPCIONISTA,
        manager: "EMP002",
        work_schedule: "Lunes a Domingo 14:00-22:00 (turnos vespertinos)",
        skills: "Atención al Cliente, Manejo de sistemas, Primeros auxilios",
        certifications: "Atención al Cliente, Primeros Auxilios",
        notes: "Recepcionista con experiencia en horario vespertino",
        version: "1.0",
        created_at: "2023-09-15T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      },
      {
        id: "EMP006",
        name: "Diego Martín Ruiz",
        first_name: "Diego",
        paternal_last_name: "Martín",
        maternal_last_name: "Ruiz",
        email: "diego.martin@algym247.com",
        primary_phone: "+52 55 6789 0123",
        position: "Entrenador Personal Senior",
        department: "Entrenamiento",
        status: "active",
        hire_date: "2023-04-10",
        date_of_birth: "1987-09-25",
        address_1: "Col. Condesa 678",
        city: "Ciudad de México",
        state: "CDMX",
        zip_code: "06140",
        emergency_contact_name: "Carmen Ruiz",
        emergency_contact_phone: "+52 55 9999 7777",
        employee_id: "ENT001",
        salary: 22000,
        access_level: AccessLevel.ENTRENADOR,
        manager: "EMP002",
        work_schedule: "Lunes a Sábado 6:00-14:00 y 16:00-20:00",
        skills: "Entrenamiento Personal, Crossfit, Funcional",
        certifications: "NSCA-CPT, Certificación Crossfit Level 1",
        notes: "Entrenador personal especializado en acondicionamiento físico",
        version: "1.0",
        created_at: "2023-04-10T08:00:00Z",
        updated_at: "2025-10-17T21:00:00Z"
      }
    ]
  }

  async getEmployees(filters?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }): Promise<{
    employees: Employee[]
    total: number
    page: number
    totalPages: number
  }> {
    let filteredEmployees = [...this.employees]

    // Apply status filter
    if (filters?.status) {
      filteredEmployees = filteredEmployees.filter(emp => emp.status === filters.status)
    }

    // Apply search filter
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase()
      filteredEmployees = filteredEmployees.filter(emp =>
        emp.name.toLowerCase().includes(searchTerm) ||
        emp.email.toLowerCase().includes(searchTerm) ||
        emp.position.toLowerCase().includes(searchTerm) ||
        emp.department.toLowerCase().includes(searchTerm) ||
        emp.employee_id.toLowerCase().includes(searchTerm)
      )
    }

    // Apply pagination
    const page = filters?.page || 1
    const limit = filters?.limit || 50
    const offset = (page - 1) * limit
    const paginatedEmployees = filteredEmployees.slice(offset, offset + limit)

    return {
      employees: paginatedEmployees,
      total: filteredEmployees.length,
      page,
      totalPages: Math.ceil(filteredEmployees.length / limit)
    }
  }

  async getEmployee(id: string): Promise<Employee | null> {
    return this.employees.find(emp => emp.id === id) || null
  }

  async createEmployee(employeeData: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
    const newEmployee: Employee = {
      ...employeeData,
      id: `EMP${String(this.employees.length + 1).padStart(3, '0')}`,
      created_at: new Date().toISOString()
    }
    
    this.employees.push(newEmployee)
    return newEmployee
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const index = this.employees.findIndex(emp => emp.id === id)
    if (index === -1) return null

    this.employees[index] = {
      ...this.employees[index],
      ...updates,
      updated_at: new Date().toISOString()
    }

    return this.employees[index]
  }

  async deleteEmployee(id: string): Promise<boolean> {
    const index = this.employees.findIndex(emp => emp.id === id)
    if (index === -1) return false

    this.employees.splice(index, 1)
    return true
  }
}