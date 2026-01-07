# Plan de Mejoras - Auditoría de Código

## Resumen Ejecutivo
Este plan aborda los problemas identificados en la auditoría del código, organizados por prioridad y esfuerzo estimado.

---

## Fase 1: Seguridad Crítica (Alta Prioridad)

### 1.1 Añadir Autenticación a API Routes
**Archivos afectados:**
- `app/api/contracts/route.ts`
- `app/api/contracts/[id]/route.ts`
- `app/api/payments/route.ts`
- `app/api/products/route.ts`
- `app/api/sales/route.ts`
- `app/api/schedule/route.ts`
- `app/api/bookings/route.ts`

**Implementación:**
```typescript
// Patrón a aplicar en cada archivo:
import { requireAnyPermission } from "@/lib/api-auth"
import { Permission } from "@/lib/permissions"

// En GET: usar getAuthenticatedUser() para datos limitados si no autenticado
// En POST/PUT/DELETE: usar requireAnyPermission() con permisos apropiados
```

**Permisos sugeridos por entidad:**
| Entidad | GET | POST | PUT | DELETE |
|---------|-----|------|-----|--------|
| Contracts | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | MANAGE_ALL_EMPLOYEES |
| Payments | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | MANAGE_ALL_EMPLOYEES |
| Products | Público (lectura) | MANAGE_ALL_EMPLOYEES | MANAGE_ALL_EMPLOYEES | MANAGE_ALL_EMPLOYEES |
| Sales | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | MANAGE_ALL_EMPLOYEES | MANAGE_ALL_EMPLOYEES |
| Schedule | Público (lectura) | MANAGE_ALL_EMPLOYEES | MANAGE_ALL_EMPLOYEES | MANAGE_ALL_EMPLOYEES |
| Bookings | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS | VIEW_ALL_MEMBERS |

### 1.2 Eliminar Credenciales Hardcodeadas
**Archivos afectados:**
- `app/api/dev-auth/route.ts` - Eliminar DEMO_USERS o mover a variables de entorno
- `app/api/seed/employees/route.ts` - Mover DEFAULT_PASSWORD a variable de entorno

**Implementación:**
```typescript
// En .env.example añadir:
DEV_DEMO_ADMIN_PASSWORD=
DEV_DEMO_USER_PASSWORD=
DEFAULT_SEED_PASSWORD=

// Modificar archivos para usar process.env
```

### 1.3 Añadir Try-Catch para request.json()
**Archivos afectados:** Todos los endpoints con POST/PUT

**Patrón a aplicar:**
```typescript
let body
try {
  body = await request.json()
} catch {
  return NextResponse.json({
    success: false,
    error: "Invalid JSON in request body"
  }, { status: 400 })
}
```

---

## Fase 2: Correcciones de Lógica (Media Prioridad)

### 2.1 Corregir Query Filters (else if → if)
**Archivos afectados:**
- `lib/firebase/employees-service.ts` (líneas ~349-357)
- `lib/firebase/members-service.ts` (líneas ~263-271)

**Problema:** Solo se aplica un filtro debido al uso de `else if`

**Solución:**
```typescript
// Cambiar de:
if (criteria.email) {
  q = query(q, where('email', '==', criteria.email))
} else if (criteria.phone) {
  q = query(q, where('primary_phone', '==', criteria.phone))
}

// A:
if (criteria.email) {
  q = query(q, where('email', '==', criteria.email))
}
if (criteria.phone) {
  q = query(q, where('primary_phone', '==', criteria.phone))
}
```

### 2.2 Usar deleteField() en lugar de null
**Archivos afectados:**
- `lib/firebase/payments-service.ts`
- `lib/firebase/contracts-service.ts`
- `lib/firebase/products-service.ts`
- `lib/firebase/schedules-service.ts`

**Implementación:**
```typescript
import { deleteField } from "firebase/firestore"

// Cambiar de:
sync_error: error || null

// A:
...(error ? { sync_error: error } : { sync_error: deleteField() })
```

### 2.3 Validación de Entrada con Zod
**Nuevos archivos a crear:**
- `lib/validations/member.ts`
- `lib/validations/contract.ts`
- `lib/validations/payment.ts`
- `lib/validations/product.ts`
- `lib/validations/sale.ts`

**Ejemplo:**
```typescript
// lib/validations/member.ts
import { z } from "zod"

export const createMemberSchema = z.object({
  first_name: z.string().min(1, "Nombre requerido"),
  paternal_last_name: z.string().min(1, "Apellido paterno requerido"),
  email: z.string().email("Email inválido"),
  primary_phone: z.string().min(10, "Teléfono inválido"),
  status: z.enum(["active", "inactive", "pending", "suspended"]).default("active"),
  monthly_amount: z.number().positive().optional(),
  // ... más campos
})

export type CreateMemberInput = z.infer<typeof createMemberSchema>
```

---

## Fase 3: Optimización de Rendimiento (Media Prioridad)

### 3.1 Usar Agregaciones de Firestore para Stats
**Archivos afectados:**
- `lib/firebase/employees-service.ts` (getStats)
- `lib/firebase/members-service.ts` (getStats)
- `lib/firebase/payments-service.ts` (getStats)
- `lib/firebase/contracts-service.ts` (getStats)

**Problema:** Se cargan todos los documentos en memoria para calcular estadísticas

**Solución:**
```typescript
import { getCountFromServer, getAggregateFromServer, sum, average } from "firebase/firestore"

async getStats() {
  const totalCount = await getCountFromServer(collection(db, COLLECTION_NAME))
  const activeQuery = query(collection(db, COLLECTION_NAME), where('status', '==', 'active'))
  const activeCount = await getCountFromServer(activeQuery)
  // ...
}
```

### 3.2 Implementar Paginación Eficiente
**Archivos afectados:** Todos los servicios Firebase con listado

**Problema:** Se cargan todos los documentos y luego se pagina en memoria

**Solución:** Usar cursores de Firestore
```typescript
import { startAfter, limit as firestoreLimit } from "firebase/firestore"

async getMembers({ pageSize = 50, lastDoc = null }) {
  let q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'))

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  q = query(q, firestoreLimit(pageSize + 1)) // +1 para saber si hay más
  // ...
}
```

---

## Fase 4: Calidad de Código (Baja Prioridad)

### 4.1 Reemplazar `any` con Tipos Específicos
**Archivos afectados:** Todos los servicios Firebase (docTo* methods)

**Implementación:**
```typescript
// Cambiar de:
private docToMember(doc: any): Member

// A:
import { DocumentSnapshot } from "firebase/firestore"
private docToMember(doc: DocumentSnapshot): Member
```

### 4.2 Estandarizar Formato de Respuesta API
**Crear helper:**
```typescript
// lib/api-response.ts
export function successResponse<T>(data: T, meta?: object) {
  return NextResponse.json({
    success: true,
    data,
    ...meta
  })
}

export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({
    success: false,
    error: message
  }, { status })
}
```

### 4.3 Añadir Try-Catch a Métodos getStats
**Archivos afectados:** Todos los servicios Firebase

**Patrón:**
```typescript
async getStats() {
  try {
    // ... lógica existente
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting stats:`, error)
    return {
      total: 0,
      active: 0,
      // ... valores por defecto
    }
  }
}
```

---

## Fase 5: Rate Limiting (Opcional)

### 5.1 Implementar Rate Limiting
**Nuevos archivos:**
- `lib/rate-limit.ts`

**Implementación:**
```typescript
// Usar librería como @upstash/ratelimit o implementar con Map en memoria
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "10 s"),
})

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier)
  return { success, limit, reset, remaining }
}
```

**Aplicar a:**
- `app/api/seed/all/route.ts`
- `app/api/monday/sync-all/route.ts`

---

## Orden de Implementación Sugerido

1. **Semana 1:** Fase 1 (Seguridad Crítica)
   - Día 1-2: Autenticación en API routes
   - Día 3: Eliminar credenciales hardcodeadas
   - Día 4-5: Try-catch para JSON parsing

2. **Semana 2:** Fase 2 (Correcciones de Lógica)
   - Día 1: Query filters
   - Día 2: deleteField()
   - Día 3-5: Validación con Zod

3. **Semana 3:** Fase 3 (Optimización)
   - Día 1-2: Agregaciones Firestore
   - Día 3-5: Paginación eficiente

4. **Semana 4:** Fase 4 y 5 (Calidad y Rate Limiting)
   - Según disponibilidad

---

## Dependencias a Instalar

```bash
npm install zod                    # Validación de esquemas
npm install @upstash/ratelimit     # Rate limiting (opcional)
npm install @upstash/redis         # Redis para rate limiting (opcional)
```

---

## Notas Importantes

1. **Testing:** Cada fase debe incluir pruebas manuales de los endpoints modificados
2. **Backwards Compatibility:** Los cambios de autenticación pueden afectar integraciones existentes
3. **Documentación:** Actualizar README si se añaden nuevas variables de entorno
4. **Rollback:** Mantener commits pequeños para facilitar reversión si es necesario
