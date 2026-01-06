# PLAN FASE 1: CORRECCIONES CRÍTICAS (Firebase)

## Decisión de Arquitectura

**Base de datos:** Firebase Firestore (Google)
**Autenticación:** Firebase Auth
**Patrón a seguir:** `lib/firebase/members-service.ts`

---

## Resumen de Hallazgos

### Problemas Identificados

| # | Problema | Impacto | Solución |
|---|----------|---------|----------|
| 1 | Empleados en memoria (se pierden al reiniciar) | 🔴 Crítico | Migrar a Firestore |
| 2 | Discrepancia access_level (SQL vs TypeScript) | 🔴 Crítico | Usar valores de TypeScript en Firestore |
| 3 | No existe endpoint de LOGIN real | 🔴 Crítico | Implementar con Firebase Auth |
| 4 | Faltan endpoints PUT y DELETE | 🟠 Alto | Crear `/api/employees/[id]` |
| 5 | Variables de entorno no documentadas | 🟠 Alto | Crear `.env.example` |

---

## TAREA 1.1: Crear EmployeesService con Firebase

### Paso 1: Crear servicio de empleados
**Archivo nuevo:** `lib/firebase/employees-service.ts`

**Estructura (siguiendo patrón de members-service.ts):**
```typescript
// Colección en Firestore: 'employees'

interface Employee {
  id?: string
  name: string
  first_name?: string
  paternal_last_name?: string
  maternal_last_name?: string
  email: string
  primary_phone: string
  secondary_phone?: string
  position: string
  department: string
  status: 'active' | 'inactive' | 'pending' | 'terminated'
  hire_date?: Timestamp
  date_of_birth?: Timestamp
  address_1?: string
  city?: string
  state?: string
  zip_code?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  employee_id: string  // ID único interno (EMP001, EMP002, etc.)
  salary?: number
  access_level: 'direccion' | 'gerente' | 'ventas' | 'recepcionista' | 'entrenador'
  manager?: string
  work_schedule?: string
  skills?: string
  certifications?: string
  notes?: string
  version?: string
  created_at?: Timestamp
  updated_at?: Timestamp
}

class EmployeesService {
  // Métodos:
  - createEmployee(data): Promise<Employee>
  - getEmployee(id): Promise<Employee | null>
  - getEmployeeByEmployeeId(employee_id): Promise<Employee | null>
  - listEmployees(options): Promise<{ employees, hasMore }>
  - updateEmployee(id, updates): Promise<void>
  - deleteEmployee(id): Promise<void>  // Soft delete
  - hardDeleteEmployee(id): Promise<void>
  - searchEmployees(criteria): Promise<Employee[]>
  - getStats(): Promise<Stats>
}
```

### Paso 2: Datos iniciales en Firestore
**Crear colección `employees` con 6 empleados iniciales:**

| employee_id | Nombre | Puesto | access_level |
|-------------|--------|--------|--------------|
| EMP001 | Ana García Rodríguez | Director General | direccion |
| EMP002 | Carlos López Martínez | Gerente de Operaciones | gerente |
| EMP003 | María Fernanda Silva | Recepcionista | recepcionista |
| EMP004 | Roberto Jiménez Pérez | Especialista en Ventas | ventas |
| EMP005 | Lucía Hernández Gómez | Recepcionista Principal | recepcionista |
| EMP006 | Diego Martín Ruiz | Entrenador Personal Senior | entrenador |

---

## TAREA 1.2: Actualizar API de Empleados

### Paso 1: Actualizar ruta principal
**Archivo:** `app/api/employees/route.ts`

**Cambios:**
```typescript
// DE: usar EmployeesService con memoria
import { EmployeesService } from "@/lib/employees-service"

// A: usar EmployeesService con Firebase
import { EmployeesService } from "@/lib/firebase/employees-service"
```

### Paso 2: Crear ruta individual
**Archivo nuevo:** `app/api/employees/[id]/route.ts`

**Endpoints:**
```typescript
GET    /api/employees/[id]  → Obtener empleado por ID
PUT    /api/employees/[id]  → Actualizar empleado
DELETE /api/employees/[id]  → Eliminar empleado (soft delete)
```

---

## TAREA 1.3: Autenticación de Empleados con Firebase

### Opción A: Firebase Auth (Recomendada)
Usar Firebase Authentication para manejar credenciales de empleados.

**Ventajas:**
- Seguridad manejada por Google
- Tokens JWT automáticos
- Recuperación de contraseña integrada
- Sesiones persistentes

**Implementación:**

### Paso 1: Crear colección de credenciales
**Colección Firestore:** `employee_credentials`

```typescript
interface EmployeeCredentials {
  id?: string
  employee_id: string  // Referencia al documento en 'employees'
  firebase_uid: string // UID de Firebase Auth
  access_level: AccessLevel
  is_active: boolean
  last_login?: Timestamp
  created_at?: Timestamp
}
```

### Paso 2: Endpoint para crear usuario de empleado
**Archivo nuevo:** `app/api/employees/[id]/auth/route.ts`

```typescript
POST /api/employees/[id]/auth
Body: { password: string }

// Lógica:
1. Obtener empleado de Firestore
2. Crear usuario en Firebase Auth (email + password)
3. Guardar mapeo en 'employee_credentials'
4. Retornar confirmación
```

### Paso 3: Endpoint de login
**Archivo nuevo:** `app/api/auth/employee/route.ts`

```typescript
POST /api/auth/employee
Body: { email: string, password: string }

// Lógica:
1. Verificar credenciales con Firebase Auth (signInWithEmailAndPassword)
2. Obtener UID del usuario
3. Buscar en 'employee_credentials' por firebase_uid
4. Obtener datos completos del empleado
5. Actualizar last_login
6. Retornar token + datos del empleado
```

### Paso 4: Helper para verificar sesión
**Archivo nuevo:** `lib/firebase/employee-auth.ts`

```typescript
// Funciones:
- verifyEmployeeToken(token): Promise<Employee | null>
- getCurrentEmployee(request): Promise<Employee | null>
- requireAuth(handler): middleware wrapper
- requireAccessLevel(level, handler): middleware con permisos
```

---

## TAREA 1.4: Variables de Entorno

### Crear .env.example
**Archivo nuevo:** `.env.example`

```env
# ========================================
# FIREBASE CONFIGURACIÓN (REQUERIDO)
# ========================================

# Firebase Client SDK (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX

# Firebase Admin SDK (Backend/Server)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# ========================================
# MONDAY.COM (OPCIONAL)
# ========================================
MONDAY_API_KEY=your-monday-api-key
MONDAY_MEMBERS_BOARD_ID=123456789
MONDAY_PRODUCTS_BOARD_ID=987654321

# ========================================
# APLICACIÓN
# ========================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## ORDEN DE EJECUCIÓN

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Crear .env.example                                       │
│    └── Documentar todas las variables necesarias            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Crear lib/firebase/employees-service.ts                  │
│    └── CRUD completo siguiendo patrón de members-service    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Actualizar app/api/employees/route.ts                    │
│    └── Usar nuevo EmployeesService de Firebase              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Crear app/api/employees/[id]/route.ts                    │
│    └── GET, PUT, DELETE individual                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Crear lib/firebase/employee-auth.ts                      │
│    └── Helpers de autenticación                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Crear app/api/employees/[id]/auth/route.ts               │
│    └── Crear credenciales de empleado                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Crear app/api/auth/employee/route.ts                     │
│    └── Login de empleados                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Poblar Firestore con datos iniciales                     │
│    └── Script o función para crear 6 empleados              │
└─────────────────────────────────────────────────────────────┘
```

---

## ARCHIVOS A CREAR

| # | Archivo | Descripción |
|---|---------|-------------|
| 1 | `.env.example` | Plantilla de variables de entorno |
| 2 | `lib/firebase/employees-service.ts` | Servicio CRUD de empleados |
| 3 | `app/api/employees/[id]/route.ts` | API empleado individual |
| 4 | `lib/firebase/employee-auth.ts` | Helpers de autenticación |
| 5 | `app/api/employees/[id]/auth/route.ts` | Crear credenciales |
| 6 | `app/api/auth/employee/route.ts` | Login de empleados |
| 7 | `scripts/seed-employees.ts` | Poblar datos iniciales |

## ARCHIVOS A MODIFICAR

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `app/api/employees/route.ts` | Usar Firebase service |
| 2 | `lib/employees-service.ts` | Eliminar (reemplazado) |

---

## ESTRUCTURA DE COLECCIONES EN FIRESTORE

```
firestore/
├── members/                    # Ya existe
│   └── {member_id}/
│
├── employees/                  # NUEVA
│   └── {employee_doc_id}/
│       ├── name: string
│       ├── email: string
│       ├── employee_id: string (EMP001, etc.)
│       ├── access_level: string
│       ├── status: string
│       └── ...
│
└── employee_credentials/       # NUEVA
    └── {credential_doc_id}/
        ├── employee_id: string (ref a employees)
        ├── firebase_uid: string
        ├── is_active: boolean
        └── last_login: timestamp
```

---

## NOTAS IMPORTANTES

1. **Firebase Auth vs Custom Auth:**
   - Usamos Firebase Auth para mayor seguridad
   - Las contraseñas nunca se guardan en Firestore
   - Firebase maneja tokens, expiración, y refresh automáticamente

2. **Mapeo de IDs:**
   - `employee_id` (EMP001, EMP002) = ID interno del gimnasio
   - `id` (documento Firestore) = ID técnico de la base de datos
   - `firebase_uid` = ID de Firebase Auth

3. **Permisos de acceso:**
   - Mantener los valores de `access_level` en español:
     - `direccion`, `gerente`, `ventas`, `recepcionista`, `entrenador`

4. **Soft Delete:**
   - No eliminar registros, solo cambiar `status` a `terminated`
   - Mantener historial de empleados

---

## ¿LISTO PARA IMPLEMENTAR?

Confirma que:
1. ✅ Tienes acceso al proyecto de Firebase
2. ✅ Tienes las credenciales del Admin SDK
3. ✅ Quieres usar los 6 empleados mock como datos iniciales

Una vez confirmado, empezaré con la implementación paso a paso.
