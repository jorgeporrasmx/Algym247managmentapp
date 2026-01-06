# PLAN FASE 1: CORRECCIONES CRÍTICAS

## Resumen de Hallazgos

Después de revisar el código actual, encontré los siguientes problemas que debemos resolver:

### Problemas Identificados

| # | Problema | Impacto | Archivos Afectados |
|---|----------|---------|-------------------|
| 1 | Empleados en memoria (se pierden al reiniciar) | 🔴 Crítico | `lib/employees-service.ts` |
| 2 | Discrepancia entre `access_level` SQL vs TypeScript | 🔴 Crítico | SQL: `admin,manager,staff,limited` vs TS: `direccion,gerente,ventas,recepcionista,entrenador` |
| 3 | No existe endpoint de LOGIN (solo crear credenciales) | 🔴 Crítico | Falta `/api/auth/employee` |
| 4 | Faltan endpoints PUT y DELETE para empleados | 🟠 Alto | `/api/employees/[id]/route.ts` |
| 5 | Variables de entorno no documentadas | 🟠 Alto | Falta `.env.example` |

---

## TAREA 1.1: Migrar Empleados a Supabase

### Paso 1: Actualizar script SQL de empleados
**Archivo:** `scripts/007_create_employees_table.sql`

**Cambios necesarios:**
- Cambiar los valores de `access_level` para que coincidan con TypeScript:
  ```sql
  -- DE:
  CHECK (access_level IN ('admin', 'manager', 'staff', 'limited'))
  -- A:
  CHECK (access_level IN ('direccion', 'gerente', 'ventas', 'recepcionista', 'entrenador'))
  ```
- Cambiar `work_schedule` a TEXT libre (no enum) para horarios flexibles
- Actualizar datos de prueba con valores correctos en español

### Paso 2: Crear nuevo EmployeesService con Supabase
**Archivo:** `lib/employees-service.ts`

**Cambios:**
- Reemplazar almacenamiento en memoria con Supabase
- Mantener la misma interfaz pública (getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee)
- Agregar manejo de errores apropiado
- Eliminar datos mock (vendrán de la base de datos)

### Paso 3: Actualizar API de empleados
**Archivo:** `app/api/employees/route.ts`

**Cambios:**
- Conectar directamente a Supabase (sin pasar por EmployeesService)
- Simplificar el código usando el cliente de Supabase

### Paso 4: Crear endpoint para empleado individual
**Archivo nuevo:** `app/api/employees/[id]/route.ts`

**Endpoints a crear:**
- `GET /api/employees/[id]` - Obtener empleado por ID
- `PUT /api/employees/[id]` - Actualizar empleado
- `DELETE /api/employees/[id]` - Eliminar empleado

### Paso 5: Crear script de migración de datos
**Archivo nuevo:** `scripts/011_seed_employees_spanish.sql`

**Contenido:**
- Insertar los 6 empleados mock actuales con datos correctos
- Usar valores de `access_level` en español

---

## TAREA 1.2: Implementar Autenticación Real de Empleados

### Paso 1: Crear endpoint de login
**Archivo nuevo:** `app/api/auth/employee/route.ts`

**Funcionalidad:**
```typescript
POST /api/auth/employee
Body: { username: string, password: string }
Response: {
  success: boolean,
  employee: { id, name, email, access_level, ... },
  token: string (opcional)
}
```

**Lógica:**
1. Buscar usuario en `employee_login_credentials`
2. Verificar contraseña con bcrypt.compare()
3. Si es válido, buscar datos completos del empleado
4. Actualizar `last_login`
5. Crear sesión (cookie o JWT)
6. Retornar datos del empleado

### Paso 2: Crear endpoint para registrar credenciales
**Archivo:** `app/api/employees/[id]/credentials/route.ts`

**Funcionalidad:**
```typescript
POST /api/employees/[id]/credentials
Body: { username: string, password: string }
```

**Lógica:**
1. Verificar que el empleado existe
2. Hash de contraseña con bcrypt
3. Crear registro en `employee_login_credentials`
4. Retornar confirmación

### Paso 3: Agregar middleware de autenticación de empleados
**Archivo:** `lib/auth/employee-session.ts`

**Funcionalidad:**
- Verificar sesión de empleado
- Obtener empleado actual de la sesión
- Helper para proteger rutas

### Paso 4: Actualizar componente de login
**Archivo:** `app/auth/employee/page.tsx` (o similar)

**Cambios:**
- Conectar formulario con nuevo endpoint `/api/auth/employee`
- Manejar respuesta de login
- Redirigir al dashboard con permisos correctos

---

## TAREA 1.3: Configuración y Variables de Entorno

### Paso 1: Crear .env.example
**Archivo nuevo:** `.env.example`

**Contenido:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Firebase (opcional - para sincronización con Monday)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Monday.com (opcional)
MONDAY_API_KEY=
MONDAY_MEMBERS_BOARD_ID=
MONDAY_PRODUCTS_BOARD_ID=

# App
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Paso 2: Actualizar lib/config.ts
**Archivo:** `lib/config.ts`

**Cambios:**
- Agregar validación de variables requeridas
- Mensajes de error claros si falta configuración
- Función para verificar modo de producción

---

## ORDEN DE EJECUCIÓN

```
1. Crear .env.example (Tarea 1.3 Paso 1)
   └── No tiene dependencias

2. Actualizar SQL de empleados (Tarea 1.1 Paso 1)
   └── Base para todo lo demás

3. Crear script de datos de prueba (Tarea 1.1 Paso 5)
   └── Depende del SQL actualizado

4. Migrar EmployeesService a Supabase (Tarea 1.1 Paso 2)
   └── Depende del SQL y datos

5. Actualizar API GET/POST empleados (Tarea 1.1 Paso 3)
   └── Depende del nuevo service

6. Crear API empleado individual [id] (Tarea 1.1 Paso 4)
   └── Depende del nuevo service

7. Crear endpoint de login (Tarea 1.2 Paso 1)
   └── Depende de empleados en Supabase

8. Crear endpoint de credenciales (Tarea 1.2 Paso 2)
   └── Depende de empleados en Supabase

9. Crear helper de sesión (Tarea 1.2 Paso 3)
   └── Depende del endpoint de login

10. Actualizar lib/config.ts (Tarea 1.3 Paso 2)
    └── Final, validación general
```

---

## ARCHIVOS A CREAR/MODIFICAR

### Archivos Nuevos:
- `app/api/employees/[id]/route.ts`
- `app/api/employees/[id]/credentials/route.ts`
- `app/api/auth/employee/route.ts`
- `lib/auth/employee-session.ts`
- `scripts/011_seed_employees_spanish.sql`
- `.env.example`

### Archivos a Modificar:
- `scripts/007_create_employees_table.sql`
- `lib/employees-service.ts`
- `app/api/employees/route.ts`
- `lib/config.ts`

---

## NOTAS IMPORTANTES

1. **No borrar datos existentes**: Si ya hay datos en Supabase, el script SQL debe usar `ON CONFLICT DO NOTHING`

2. **Compatibilidad hacia atrás**: Mantener la misma interfaz del EmployeesService para no romper componentes existentes

3. **Seguridad de contraseñas**: Usar bcrypt con salt rounds >= 12

4. **Sesiones**: Decidir entre:
   - Cookies HTTP-only (más seguro)
   - JWT en localStorage (más simple pero menos seguro)
   - Recomendación: Cookies HTTP-only

5. **Permisos**: El login debe retornar el `access_level` del empleado para que el frontend pueda mostrar/ocultar funciones

---

## PREGUNTA PARA EL USUARIO

Antes de empezar la implementación, necesito confirmar:

1. **¿Ya tienes Supabase configurado con las credenciales reales?**
   - Si no, podemos trabajar primero en el código y luego configurar Supabase

2. **¿Prefieres usar cookies o JWT para las sesiones de empleados?**
   - Cookies: Más seguro, funciona mejor con SSR
   - JWT: Más simple, pero almacenado en el cliente

3. **¿Quieres que los 6 empleados mock sean los datos iniciales?**
   - O prefieres empezar con datos vacíos
