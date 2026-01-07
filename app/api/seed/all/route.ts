import { type NextRequest, NextResponse } from "next/server"
import { MembersService } from "@/lib/firebase/members-service"
import { ContractsService } from "@/lib/firebase/contracts-service"
import { PaymentsService } from "@/lib/firebase/payments-service"
import { ProductsService } from "@/lib/firebase/products-service"
import { SchedulesService } from "@/lib/firebase/schedules-service"
import { BookingsService } from "@/lib/firebase/bookings-service"
import {
  strictRateLimiter,
  getClientIdentifier,
  rateLimitExceededResponse
} from "@/lib/rate-limit"

// Sample Members
const SAMPLE_MEMBERS = [
  {
    first_name: "Juan Carlos",
    paternal_last_name: "Pérez",
    maternal_last_name: "García",
    email: "juan.perez@email.com",
    primary_phone: "+52 55 1111 2222",
    date_of_birth: new Date("1990-05-15"),
    address_1: "Av. Revolución 123",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "03100",
    status: "active" as const,
    selected_plan: "Premium Mensual",
    monthly_amount: 899,
    access_type: "24/7",
    direct_debit: "Domiciliado" as const,
    emergency_contact_name: "María Pérez",
    emergency_contact_phone: "+52 55 3333 4444",
    how_did_you_hear: "Recomendación"
  },
  {
    first_name: "María Elena",
    paternal_last_name: "González",
    maternal_last_name: "López",
    email: "maria.gonzalez@email.com",
    primary_phone: "+52 55 2222 3333",
    date_of_birth: new Date("1985-08-22"),
    address_1: "Calle Durango 456",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06700",
    status: "active" as const,
    selected_plan: "Básico Mensual",
    monthly_amount: 599,
    access_type: "Horario Regular",
    direct_debit: "No domiciliado" as const,
    emergency_contact_name: "Pedro González",
    emergency_contact_phone: "+52 55 5555 6666",
    how_did_you_hear: "Instagram"
  },
  {
    first_name: "Roberto",
    paternal_last_name: "Martínez",
    maternal_last_name: "Sánchez",
    email: "roberto.martinez@email.com",
    primary_phone: "+52 55 3333 4444",
    date_of_birth: new Date("1988-12-10"),
    address_1: "Col. Roma Norte 789",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06700",
    status: "active" as const,
    selected_plan: "Anual Todo Incluido",
    monthly_amount: 749,
    access_type: "24/7",
    direct_debit: "Domiciliado" as const,
    emergency_contact_name: "Ana Martínez",
    emergency_contact_phone: "+52 55 7777 8888",
    how_did_you_hear: "Google"
  },
  {
    first_name: "Laura",
    paternal_last_name: "Hernández",
    maternal_last_name: "Ruiz",
    email: "laura.hernandez@email.com",
    primary_phone: "+52 55 4444 5555",
    date_of_birth: new Date("1995-03-28"),
    address_1: "Av. Universidad 321",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "04510",
    status: "active" as const,
    selected_plan: "Premium Mensual",
    monthly_amount: 899,
    access_type: "24/7",
    direct_debit: "Domiciliado" as const,
    emergency_contact_name: "Carlos Hernández",
    emergency_contact_phone: "+52 55 9999 0000",
    how_did_you_hear: "Facebook"
  },
  {
    first_name: "Fernando",
    paternal_last_name: "Torres",
    maternal_last_name: "Vega",
    email: "fernando.torres@email.com",
    primary_phone: "+52 55 5555 6666",
    date_of_birth: new Date("1992-07-14"),
    address_1: "Col. Condesa 654",
    city: "Ciudad de México",
    state: "CDMX",
    zip_code: "06140",
    status: "pending" as const,
    selected_plan: "Básico Mensual",
    monthly_amount: 599,
    access_type: "Horario Regular",
    direct_debit: "No domiciliado" as const,
    emergency_contact_name: "Isabel Torres",
    emergency_contact_phone: "+52 55 1111 0000",
    how_did_you_hear: "Volantes"
  }
]

// Sample Products
const SAMPLE_PRODUCTS = [
  {
    name: "Proteína Whey Chocolate 2kg",
    brand: "Optimum Nutrition",
    category: "Suplementos",
    description: "Proteína de suero de leche sabor chocolate",
    price: 1299,
    cost: 850,
    stock: 25,
    stock_minimum: 10,
    status: "active" as const
  },
  {
    name: "Creatina Monohidrato 500g",
    brand: "MuscleTech",
    category: "Suplementos",
    description: "Creatina pura para mejorar rendimiento",
    price: 549,
    cost: 320,
    stock: 30,
    stock_minimum: 15,
    status: "active" as const
  },
  {
    name: "BCAA 300g Frutas",
    brand: "BSN",
    category: "Suplementos",
    description: "Aminoácidos de cadena ramificada",
    price: 699,
    cost: 420,
    stock: 20,
    stock_minimum: 10,
    status: "active" as const
  },
  {
    name: "Shaker Premium 700ml",
    brand: "BlenderBottle",
    category: "Accesorios",
    description: "Vaso mezclador con bola de alambre",
    price: 299,
    cost: 150,
    stock: 50,
    stock_minimum: 20,
    status: "active" as const
  },
  {
    name: "Guantes de Entrenamiento M",
    brand: "Nike",
    category: "Accesorios",
    description: "Guantes acolchonados para levantamiento",
    price: 449,
    cost: 280,
    stock: 15,
    stock_minimum: 5,
    status: "active" as const
  },
  {
    name: "Cinturón Lumbar L",
    brand: "Harbinger",
    category: "Accesorios",
    description: "Cinturón de soporte para levantamiento pesado",
    price: 799,
    cost: 480,
    stock: 8,
    stock_minimum: 3,
    status: "active" as const
  },
  {
    name: "Barra de Proteína x12",
    brand: "Quest",
    category: "Snacks",
    description: "Caja de 12 barras de proteína",
    price: 599,
    cost: 380,
    stock: 40,
    stock_minimum: 15,
    status: "active" as const
  },
  {
    name: "Agua Mineral 600ml",
    brand: "Evian",
    category: "Bebidas",
    description: "Agua mineral natural",
    price: 35,
    cost: 18,
    stock: 100,
    stock_minimum: 50,
    status: "active" as const
  },
  {
    name: "Bebida Isotónica 500ml",
    brand: "Gatorade",
    category: "Bebidas",
    description: "Bebida deportiva sabor limón",
    price: 45,
    cost: 25,
    stock: 80,
    stock_minimum: 30,
    status: "active" as const
  },
  {
    name: "Toalla de Gimnasio",
    brand: "Under Armour",
    category: "Accesorios",
    description: "Toalla de microfibra absorbente",
    price: 249,
    cost: 120,
    stock: 35,
    stock_minimum: 10,
    status: "active" as const
  }
]

// Sample Schedules (Classes)
const SAMPLE_SCHEDULES = [
  {
    class_name: "Yoga Matutino",
    instructor: "Lucía Mendoza",
    class_type: "Yoga",
    description: "Clase de yoga para comenzar el día con energía",
    start_time: getNextWeekday(1, 7, 0), // Monday 7:00
    end_time: getNextWeekday(1, 8, 0),   // Monday 8:00
    max_capacity: 15,
    location: "Sala de Yoga",
    status: "scheduled" as const
  },
  {
    class_name: "Spinning Intensivo",
    instructor: "Diego Martín",
    class_type: "Cardio",
    description: "Clase de ciclismo de alta intensidad",
    start_time: getNextWeekday(1, 18, 0), // Monday 18:00
    end_time: getNextWeekday(1, 19, 0),   // Monday 19:00
    max_capacity: 20,
    location: "Sala de Spinning",
    status: "scheduled" as const
  },
  {
    class_name: "Funcional HIIT",
    instructor: "Carlos López",
    class_type: "Funcional",
    description: "Entrenamiento funcional de alta intensidad",
    start_time: getNextWeekday(2, 7, 0), // Tuesday 7:00
    end_time: getNextWeekday(2, 8, 0),   // Tuesday 8:00
    max_capacity: 12,
    location: "Área Funcional",
    status: "scheduled" as const
  },
  {
    class_name: "Pilates",
    instructor: "Ana García",
    class_type: "Pilates",
    description: "Clase de pilates para fortalecer el core",
    start_time: getNextWeekday(2, 10, 0), // Tuesday 10:00
    end_time: getNextWeekday(2, 11, 0),   // Tuesday 11:00
    max_capacity: 10,
    location: "Sala de Pilates",
    status: "scheduled" as const
  },
  {
    class_name: "Zumba",
    instructor: "María Silva",
    class_type: "Baile",
    description: "Clase de baile fitness con música latina",
    start_time: getNextWeekday(3, 19, 0), // Wednesday 19:00
    end_time: getNextWeekday(3, 20, 0),   // Wednesday 20:00
    max_capacity: 25,
    location: "Sala Principal",
    status: "scheduled" as const
  },
  {
    class_name: "CrossFit",
    instructor: "Diego Martín",
    class_type: "CrossFit",
    description: "Entrenamiento CrossFit para todos los niveles",
    start_time: getNextWeekday(4, 6, 0), // Thursday 6:00
    end_time: getNextWeekday(4, 7, 0),   // Thursday 7:00
    max_capacity: 15,
    location: "Box CrossFit",
    status: "scheduled" as const
  },
  {
    class_name: "Boxeo Fitness",
    instructor: "Roberto Jiménez",
    class_type: "Combat",
    description: "Clase de boxeo cardio sin contacto",
    start_time: getNextWeekday(5, 18, 0), // Friday 18:00
    end_time: getNextWeekday(5, 19, 0),   // Friday 19:00
    max_capacity: 15,
    location: "Sala de Combat",
    status: "scheduled" as const
  },
  {
    class_name: "Yoga Restaurativo",
    instructor: "Lucía Mendoza",
    class_type: "Yoga",
    description: "Yoga suave para recuperación y relajación",
    start_time: getNextWeekday(6, 9, 0), // Saturday 9:00
    end_time: getNextWeekday(6, 10, 0),  // Saturday 10:00
    max_capacity: 12,
    location: "Sala de Yoga",
    status: "scheduled" as const
  }
]

// Helper function to get next weekday date
function getNextWeekday(dayOfWeek: number, hours: number, minutes: number): Date {
  const now = new Date()
  const currentDay = now.getDay()
  let daysUntil = dayOfWeek - currentDay
  if (daysUntil <= 0) daysUntil += 7

  const nextDate = new Date(now)
  nextDate.setDate(now.getDate() + daysUntil)
  nextDate.setHours(hours, minutes, 0, 0)
  return nextDate
}

// POST /api/seed/all - Seed all data
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - strict limit for dangerous seed operation
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await strictRateLimiter.check(`seed:${clientId}`)

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult)
    }

    // Security check
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

    const results = {
      members: { created: 0, skipped: 0, errors: [] as string[] },
      contracts: { created: 0, skipped: 0, errors: [] as string[] },
      payments: { created: 0, errors: [] as string[] },
      products: { created: 0, skipped: 0, errors: [] as string[] },
      schedules: { created: 0, skipped: 0, errors: [] as string[] }
    }

    const membersService = MembersService.getInstance()
    const contractsService = ContractsService.getInstance()
    const paymentsService = PaymentsService.getInstance()
    const productsService = ProductsService.getInstance()
    const schedulesService = SchedulesService.getInstance()

    // 1. Seed Members
    console.log("[Seed] Creating members...")
    const createdMembers: { id: string; email: string }[] = []

    for (const memberData of SAMPLE_MEMBERS) {
      try {
        // Check if member exists by email
        const existingMembers = await membersService.getMembers({ limit: 100 })
        const existing = existingMembers.members.find(m => m.email === memberData.email)

        if (existing && !force) {
          results.members.skipped++
          createdMembers.push({ id: existing.id!, email: existing.email })
          continue
        }

        const member = await membersService.createMember(memberData)
        results.members.created++
        createdMembers.push({ id: member.id!, email: member.email })
      } catch (error) {
        results.members.errors.push(memberData.email)
      }
    }

    // 2. Seed Contracts for members
    console.log("[Seed] Creating contracts...")
    for (const member of createdMembers) {
      try {
        // Check if contract exists
        const existingContracts = await contractsService.getContractsByMember(member.id)
        if (existingContracts.length > 0 && !force) {
          results.contracts.skipped++
          continue
        }

        const startDate = new Date()
        const endDate = new Date()
        endDate.setFullYear(endDate.getFullYear() + 1)

        const contract = await contractsService.createContract({
          member_id: member.id,
          contract_type: "annual",
          start_date: startDate,
          end_date: endDate,
          monthly_fee: 799,
          payment_day: 1,
          status: "active"
        })
        results.contracts.created++

        // 3. Create a payment for the contract
        try {
          await paymentsService.createPayment({
            contract_id: contract.id!,
            member_id: member.id,
            amount: 799,
            payment_method: "credit_card",
            status: "completed",
            due_date: new Date(),
            paid_date: new Date(),
            notes: "Pago inicial de membresía"
          })
          results.payments.created++
        } catch (payError) {
          results.payments.errors.push(member.email)
        }
      } catch (error) {
        results.contracts.errors.push(member.email)
      }
    }

    // 4. Seed Products
    console.log("[Seed] Creating products...")
    for (const productData of SAMPLE_PRODUCTS) {
      try {
        const existingProducts = await productsService.getProducts({ limit: 100 })
        const existing = existingProducts.products.find(p => p.name === productData.name)

        if (existing && !force) {
          results.products.skipped++
          continue
        }

        await productsService.createProduct(productData)
        results.products.created++
      } catch (error) {
        results.products.errors.push(productData.name)
      }
    }

    // 5. Seed Schedules
    console.log("[Seed] Creating schedules...")
    for (const scheduleData of SAMPLE_SCHEDULES) {
      try {
        const existingSchedules = await schedulesService.getSchedules({ limit: 100 })
        const existing = existingSchedules.schedules.find(s =>
          s.class_name === scheduleData.class_name &&
          s.instructor === scheduleData.instructor
        )

        if (existing && !force) {
          results.schedules.skipped++
          continue
        }

        await schedulesService.createSchedule(scheduleData)
        results.schedules.created++
      } catch (error) {
        results.schedules.errors.push(scheduleData.class_name)
      }
    }

    console.log("[Seed] Completed:", results)

    return NextResponse.json({
      success: true,
      message: "Seed completed successfully",
      results
    })
  } catch (error) {
    console.error("[Seed] Error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to seed data" },
      { status: 500 }
    )
  }
}

// GET /api/seed/all - Get seed status
export async function GET() {
  try {
    const membersService = MembersService.getInstance()
    const contractsService = ContractsService.getInstance()
    const productsService = ProductsService.getInstance()
    const schedulesService = SchedulesService.getInstance()

    const [members, products, schedules] = await Promise.all([
      membersService.getMembers({ limit: 1 }),
      productsService.getProducts({ limit: 1 }),
      schedulesService.getSchedules({ limit: 1 })
    ])

    // Get contracts count
    const allMembers = await membersService.getMembers({ limit: 100 })
    let contractsCount = 0
    for (const member of allMembers.members) {
      const contracts = await contractsService.getContractsByMember(member.id!)
      contractsCount += contracts.length
    }

    return NextResponse.json({
      success: true,
      data: {
        members: { count: members.total, expected: SAMPLE_MEMBERS.length },
        contracts: { count: contractsCount, expected: SAMPLE_MEMBERS.length },
        products: { count: products.total, expected: SAMPLE_PRODUCTS.length },
        schedules: { count: schedules.total, expected: SAMPLE_SCHEDULES.length },
        isSeeded: members.total > 0 && products.total > 0 && schedules.total > 0
      }
    })
  } catch (error) {
    console.error("[Seed] Error checking status:", error)
    return NextResponse.json(
      { success: false, error: "Failed to check seed status" },
      { status: 500 }
    )
  }
}
