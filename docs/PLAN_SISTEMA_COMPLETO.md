# Plan Completo: Sistema Algym247 Funcional

## Estado Actual (6 Enero 2026)

### Resumen por Módulo

| Módulo | Estado | Base de Datos | Monday.com | Prioridad |
|--------|--------|---------------|------------|-----------|
| Employees | 85% | Firebase ✅ | Pendiente | Alta |
| Members | 95% | Firebase ✅ | Sincronizado ✅ | Media |
| Contracts | 70% | Supabase ⚠️ | Parcial | Alta |
| Payments | 60% | Supabase ⚠️ | Pendiente | Alta |
| Products | 80% | Monday.com | Lectura ✅ | Media |
| Inventory | 90% | Google Sheets | N/A | Baja |
| POS | 95% | Mixto | Lectura ✅ | Baja |
| Schedule | 50% | Supabase ⚠️ | No | Media |

---

## FASE 1: Correcciones Críticas (Completada ✅)

- [x] Migrar empleados a Firebase
- [x] Sistema de autenticación de empleados
- [x] Permisos por nivel de acceso
- [x] Limpieza de código legacy
- [x] Mejoras de seguridad

---

## FASE 2: Migración a Firebase (Prioridad ALTA)

### 2.1 Migrar Contracts a Firebase
**Tiempo estimado: 4-6 horas**

**Archivos a crear:**
```
lib/firebase/contracts-service.ts
lib/monday/contracts-api.ts (si aplica)
```

**Archivos a modificar:**
```
app/api/contracts/route.ts
app/api/contracts/[id]/route.ts
app/contracts/page.tsx
app/contracts/add/page.tsx
```

**Tareas:**
1. Crear `contracts-service.ts` con métodos CRUD
2. Definir estructura en Firestore:
   ```typescript
   interface Contract {
     id: string
     member_id: string
     contract_type: 'monthly' | 'quarterly' | 'annual'
     start_date: Date
     end_date: Date
     monthly_fee: number
     status: 'active' | 'expired' | 'cancelled' | 'pending'
     payment_day: number // día del mes para cobro
     monday_item_id?: string
     created_at: Date
     updated_at: Date
   }
   ```
3. Migrar endpoints API a Firebase
4. Actualizar páginas frontend
5. Crear script de migración de datos Supabase → Firebase

### 2.2 Migrar Payments a Firebase
**Tiempo estimado: 4-6 horas**

**Archivos a crear:**
```
lib/firebase/payments-service.ts
```

**Archivos a modificar:**
```
app/api/payments/route.ts
app/api/payments/generate/route.ts
app/api/webhooks/fiserv/route.ts
app/payments/page.tsx
```

**Tareas:**
1. Crear `payments-service.ts`
2. Definir estructura en Firestore:
   ```typescript
   interface Payment {
     id: string
     contract_id: string
     member_id: string
     amount: number
     payment_date: Date
     due_date: Date
     payment_method: 'cash' | 'card' | 'transfer' | 'online'
     status: 'pending' | 'completed' | 'failed' | 'refunded'
     transaction_id?: string
     fiserv_reference?: string
     monday_item_id?: string
     created_at: Date
     updated_at: Date
   }
   ```
3. Migrar endpoints API
4. Mantener integración con Fiserv webhook

### 2.3 Migrar Schedule a Firebase
**Tiempo estimado: 3-4 horas**

**Archivos a crear:**
```
lib/firebase/schedule-service.ts
lib/firebase/bookings-service.ts
```

**Archivos a modificar:**
```
app/api/schedule/route.ts
app/api/bookings/route.ts
app/schedule/page.tsx
```

**Tareas:**
1. Crear servicios de Schedule y Bookings
2. Definir estructuras en Firestore
3. Migrar endpoints
4. Crear página de agregar clase

---

## FASE 3: Completar Funcionalidades UI (Prioridad MEDIA)

### 3.1 Páginas de Detalle
**Tiempo estimado: 6-8 horas**

Crear páginas de detalle para:

| Página | Ruta | Funcionalidad |
|--------|------|---------------|
| Empleado | `/employees/[id]/page.tsx` | Ver/editar perfil, historial, cambiar contraseña |
| Miembro | `/members/[id]/page.tsx` | Ver/editar perfil, contratos, pagos |
| Contrato | `/contracts/[id]/page.tsx` | Ver/editar contrato, historial de pagos |

**Para cada página:**
- Vista de información detallada
- Formulario de edición
- Historial de actividad
- Acciones rápidas (activar/desactivar, etc.)

### 3.2 Página de Agregar Schedule
**Tiempo estimado: 2-3 horas**

Crear `/schedule/add/page.tsx`:
- Formulario de nueva clase
- Selección de instructor (empleados con rol entrenador)
- Configuración de capacidad
- Horario recurrente

### 3.3 Página de Agregar Payment
**Tiempo estimado: 2-3 horas**

Crear `/payments/add/page.tsx`:
- Registro de pago manual
- Selección de miembro/contrato
- Generación de link de pago Fiserv

---

## FASE 4: Integraciones Monday.com (Prioridad MEDIA)

### 4.1 Sincronización de Empleados
**Tiempo estimado: 3-4 horas**

**Archivos a crear/modificar:**
```
lib/monday/employees-api.ts (completar)
app/api/monday/employees-sync/route.ts
```

**Tareas:**
1. Mapear columnas de Monday.com para empleados
2. Implementar sincronización bidireccional
3. Agregar webhook handler para empleados

### 4.2 Sincronización de Contratos
**Tiempo estimado: 3-4 horas**

**Tareas:**
1. Crear `lib/monday/contracts-api.ts`
2. Mapear columnas
3. Implementar sincronización

### 4.3 Sincronización de Pagos
**Tiempo estimado: 2-3 horas**

**Tareas:**
1. Crear `lib/monday/payments-api.ts`
2. Sincronizar estado de pagos
3. Notificaciones de pagos vencidos

---

## FASE 5: Integración Fiserv (Prioridad ALTA)

### 5.1 Completar Integración de Pagos
**Tiempo estimado: 6-8 horas**

**Archivos a modificar:**
```
lib/payment-services.ts
app/api/payments/generate/route.ts
app/api/webhooks/fiserv/route.ts
```

**Tareas:**
1. Implementar `createPaymentLink()` real con API de Fiserv
2. Configurar credenciales de Fiserv (sandbox → producción)
3. Implementar verificación de firma en webhook
4. Crear flujo de checkout completo:
   - Generar link → Enviar a cliente → Recibir webhook → Actualizar estado

**Variables de entorno requeridas:**
```
FISERV_API_KEY=
FISERV_API_SECRET=
FISERV_MERCHANT_ID=
FISERV_WEBHOOK_SECRET=
FISERV_ENVIRONMENT=sandbox|production
```

### 5.2 Página de Checkout
**Tiempo estimado: 3-4 horas**

Mejorar `/checkout/page.tsx`:
- Resumen de compra
- Múltiples métodos de pago
- Confirmación visual
- Recibo/comprobante

---

## FASE 6: Seguridad y Producción (Prioridad ALTA)

### 6.1 Corregir Token Monday.com Hardcodeado
**Tiempo estimado: 30 minutos**

**Archivo:** `lib/monday-api.ts` línea 4

```typescript
// ANTES (INSEGURO):
const MONDAY_API_TOKEN = "eyJhbGc..."

// DESPUÉS:
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN
```

### 6.2 Validación de Permisos en Endpoints
**Tiempo estimado: 4-6 horas**

Agregar middleware de autenticación a:
- `/api/employees/*` (excepto login)
- `/api/members/*`
- `/api/contracts/*`
- `/api/payments/*`
- `/api/reports/*`

**Implementar:**
```typescript
// lib/middleware/auth.ts
export async function requireAuth(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  return session
}

export async function requirePermission(session: Session, permission: Permission) {
  if (!hasPermission(session.accessLevel, permission)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}
```

### 6.3 Variables de Entorno de Producción
**Tiempo estimado: 1 hora**

Actualizar `.env.example` con todas las variables:
```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
...

# Monday.com
MONDAY_API_TOKEN=
MONDAY_MEMBERS_BOARD_ID=
MONDAY_EMPLOYEES_BOARD_ID=
...

# Fiserv
FISERV_API_KEY=
FISERV_MERCHANT_ID=
...

# Security
SEED_SECRET_KEY=
SESSION_SECRET=
```

---

## FASE 7: Pruebas y QA (Prioridad MEDIA)

### 7.1 Pruebas Manuales
**Tiempo estimado: 4-6 horas**

Checklist por módulo:
- [ ] Login empleado funciona
- [ ] CRUD empleados funciona
- [ ] CRUD miembros funciona
- [ ] Sincronización Monday.com funciona
- [ ] Contratos se crean correctamente
- [ ] Pagos se registran
- [ ] POS procesa ventas
- [ ] Reportes generan datos correctos

### 7.2 Pruebas de Integración (Opcional)
**Tiempo estimado: 8+ horas**

Configurar Jest/Vitest para:
- Servicios de Firebase
- Endpoints API
- Integraciones Monday.com

---

## RESUMEN DE PRIORIDADES

### Inmediato (Esta semana)
1. ⚠️ Corregir token Monday.com hardcodeado
2. Migrar Contracts a Firebase
3. Migrar Payments a Firebase

### Corto plazo (2 semanas)
4. Migrar Schedule a Firebase
5. Crear páginas de detalle
6. Completar sincronización Monday.com empleados

### Mediano plazo (1 mes)
7. Integración Fiserv completa
8. Validación de permisos en todos los endpoints
9. Pruebas y QA

### Largo plazo
10. Eliminar completamente Supabase
11. Dashboard de analytics
12. App móvil (opcional)

---

## CHECKLIST PARA PRODUCCIÓN

- [ ] Todas las variables de entorno configuradas
- [ ] Token Monday.com en variable de entorno
- [ ] Firebase configurado con reglas de seguridad
- [ ] Fiserv en modo producción
- [ ] SSL/HTTPS configurado
- [ ] Dominio configurado
- [ ] Backups automáticos de Firestore
- [ ] Monitoreo de errores (Sentry o similar)
- [ ] Logs centralizados
- [ ] Rate limiting en APIs

---

## NOTAS ADICIONALES

### Qué puede hacer Claude ahora:
- Crear los archivos de servicios de Firebase
- Modificar endpoints API
- Crear nuevas páginas UI
- Configurar integraciones

### Qué necesitas hacer tú:
- Configurar credenciales de Firebase en consola
- Crear tableros de Monday.com y obtener IDs
- Configurar cuenta de Fiserv
- Hacer deploy a producción
- Pruebas manuales del sistema

---

*Última actualización: 6 Enero 2026*
*Autor: Claude (Fase de Planificación)*
