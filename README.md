# Al Gym 247 — Management App

Sistema de administración de gimnasios 24/7. Integración con Monday.com para sincronización de miembros y contratos en tiempo real.

## Stack

- **Framework**: Next.js 14 (App Router)
- **Base de datos**: Firebase Firestore
- **Autenticación**: Firebase Auth
- **Storage**: Firebase Storage
- **Deploy**: Vercel
- **Integración**: Monday.com (webhooks bidireccionales)

## API Endpoints

### Miembros
- `GET /api/members` — Listar miembros con paginación y filtros
- `GET /api/members/[id]` — Detalle de miembro con contratos
- `POST /api/members` — Crear nuevo miembro

### Contratos
- `GET /api/contracts` — Listar contratos
- `GET /api/contracts/[id]` — Detalle de contrato
- `POST /api/contracts` — Crear contrato

### Pagos
- `GET /api/payments` — Listar transacciones
- `POST /api/payments` — Registrar pago

### Agenda
- `GET /api/schedule` — Clases programadas
- `POST /api/schedule` — Crear clase

### Estadísticas
- `GET /api/stats` — Dashboard: miembros, contratos, pagos, clases

### Webhooks Monday.com
- `POST /api/webhook/monday` — Recibir eventos de Monday
- `POST /api/webhook/monday/members` — Sync de miembros

## Variables de entorno requeridas

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY
MONDAY_API_TOKEN
MONDAY_WEBHOOK_SECRET
```

## Integración con el funnel de ventas

El app cierra el loop **Lead → Miembro activo**:
1. Lead capturado en Monday (Facebook Ads / Voice Agent / WhatsApp)
2. Lead se convierte → se registra en Firebase vía API
3. Firebase es la fuente de verdad: miembros, contratos y pagos
4. Monday se sincroniza vía webhooks para visibilidad centralizada

## Desarrollo

```bash
npm install
npm run dev
```
