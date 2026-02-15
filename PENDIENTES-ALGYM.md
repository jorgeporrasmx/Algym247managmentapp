# 📋 AlGym Management App - Lista de Pendientes

**Fecha:** 15 Feb 2026  
**Generado por:** Juan  
**URL Vercel:** https://algym-management-app.vercel.app

---

## 🔴 CRÍTICO - Variables de Entorno Faltantes en Vercel

Actualmente en Vercel solo hay 2 variables configuradas:
- ✅ `MONDAY_API_TOKEN`
- ✅ `MONDAY_MEMBERS_BOARD_ID`

### Faltan (Firebase):
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
```

### Faltan (Otros):
```
MONDAY_WEBHOOK_SECRET
```

---

## 🟡 PENDIENTE - Migración Supabase → Firebase

El código actual usa Supabase en **20+ archivos**. Necesita migración a Firebase:

### APIs que usan Supabase:
1. `/api/webhook/monday/route.ts` - Webhooks de Monday
2. `/api/members/[id]/route.ts` - CRUD miembros
3. `/api/contracts/route.ts` - CRUD contratos
4. `/api/contracts/[id]/route.ts` - Contrato individual
5. `/api/payments/route.ts` - Pagos
6. `/api/payments/generate/route.ts` - Generar pagos
7. `/api/products/route.ts` - Productos/Inventario
8. `/api/schedule/route.ts` - Horarios/Clases
9. `/api/bookings/route.ts` - Reservaciones
10. `/api/sales/route.ts` - Ventas
11. `/api/stats/route.ts` - Estadísticas dashboard
12. `/api/webhook-logs/route.ts` - Logs de webhooks
13. `/api/employees/[id]/route.ts` - Empleados
14. `/api/employee-login/route.ts` - Login empleados
15. `/api/employee-auth/route.ts` - Auth empleados
16. `/api/reports/expiring/route.ts` - Reportes vencimiento
17. `/api/reports/overdue/route.ts` - Reportes adeudos
18. `/api/webhooks/fiserv/route.ts` - Pagos Fiserv

### Páginas que usan Supabase:
1. `/auth/login/page.tsx`
2. `/auth/sign-up/page.tsx`

---

## 🟢 YA PREPARADO (solo necesita credenciales)

- ✅ `lib/firebase/config.ts` - Cliente Firebase
- ✅ `lib/firebase/admin.ts` - Admin SDK
- ✅ `lib/firebase/members-service.ts` - Servicio de miembros

---

## 📝 TAREAS PARA SAEED (Manual)

### 1. Obtener credenciales de Firebase
Jorge ya agregó a juan@sutilde.com como editor en Firebase "Al Gym Central".

**Pasos:**
1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Seleccionar proyecto "Al Gym Central"
3. ⚙️ Settings → Project settings
4. Tab "General" → Sección "Your apps" → Web app
5. Copiar el objeto `firebaseConfig`:
```javascript
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
}
```

### 2. Generar Service Account (Admin SDK)
1. ⚙️ Settings → "Service accounts" tab
2. Click "Generate new private key"
3. Descargar JSON
4. Extraer: `project_id`, `client_email`, `private_key`

### 3. Configurar Webhooks en Monday.com
1. Monday.com → Developers → Apps
2. Crear webhook para board "Gestión de Socios" (18092113859)
3. URL: `https://algym-management-app.vercel.app/api/webhook/monday`
4. Events: `create_item`, `change_column_value`
5. Copiar el "Signing Secret"

### 4. Configurar reglas Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /members/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /contracts/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /sync_logs/{document=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

---

## 📝 TAREAS PARA JUAN (Código)

### Fase 1: Configurar Variables de Entorno
- [ ] Recibir credenciales de Saeed/Jorge
- [ ] Agregar todas las variables a Vercel
- [ ] Actualizar .env.local

### Fase 2: Migrar APIs Críticas
1. [ ] `/api/members/[id]/route.ts` → Firebase
2. [ ] `/api/contracts/route.ts` → Firebase
3. [ ] `/api/webhook/monday/route.ts` → Firebase
4. [ ] `/api/stats/route.ts` → Firebase

### Fase 3: Migrar Auth
1. [ ] `/auth/login/page.tsx` → Firebase Auth
2. [ ] `/auth/sign-up/page.tsx` → Firebase Auth
3. [ ] `/api/employee-login/route.ts` → Firebase Auth

### Fase 4: Migrar APIs Secundarias
1. [ ] `/api/payments/route.ts`
2. [ ] `/api/products/route.ts`
3. [ ] `/api/schedule/route.ts`
4. [ ] `/api/bookings/route.ts`
5. [ ] `/api/sales/route.ts`
6. [ ] `/api/reports/*`

### Fase 5: Testing
- [ ] Probar login/signup
- [ ] Probar CRUD miembros
- [ ] Probar webhook Monday
- [ ] Probar sincronización bidireccional

---

## 🔄 ESTADO DE INTEGRACIÓN MONDAY

### Boards Configurados:
| Board | ID | Status |
|-------|-----|--------|
| Gestión de Socios | 18092113859 | ⚠️ Webhook no configurado |
| Ventas de artículos | 9944534259 | ⚠️ Webhook no configurado |

### Mapeo de Columnas:
Ver `docs/MONDAY_INTEGRATION.md` - ✅ Documentado

---

## 📊 PROGRESO GENERAL

| Categoría | Completado | Pendiente |
|-----------|------------|-----------|
| Variables Entorno | 2/12 | 10 |
| Migración APIs | 3/20 | 17 |
| Auth Firebase | 0/3 | 3 |
| Webhooks Monday | 0/2 | 2 |
| Reglas Firestore | 0/1 | 1 |
| Testing | 0/5 | 5 |

**Estimación tiempo total:** 8-12 horas de desarrollo

---

## ⚡ PRÓXIMOS PASOS INMEDIATOS

1. **Saeed** obtiene firebaseConfig y service account
2. **Juan** agrega variables a Vercel
3. **Juan** migra API de miembros como prueba piloto
4. **Saeed** configura webhook en Monday
5. **Juan** prueba flujo completo

---

*Actualizado: 15 Feb 2026 13:15*
