# Development Handoff Instructions for Zaid

## Project: Algym247 Management App - Monday.com Integration

---

## 1. PROJECT OVERVIEW

### Goal
Create a **bidirectional sync** between the Algym247 gym management app (Firebase) and Monday.com, so that:
- When a member is created/updated in the app → it syncs to Monday.com
- When a member is created/updated in Monday.com → it syncs to Firebase
- Eventually expand to: Contracts, Payments, Employees, Inventory, Schedule

### Current Focus
**Test with ONE board first (Members/Socios)** before expanding to other entities.

---

## 2. WHAT HAS BEEN COMPLETED ✅

### Phase 0: Security
- [x] Removed hardcoded API tokens from code
- [x] Created secure environment variable configuration
- [x] Implemented HMAC-SHA256 webhook signature verification
- [x] Created `.env.example` template

### Phase 2: Sync Services
- [x] Created Firebase services for all entities:
  - `lib/firebase/members-service.ts`
  - `lib/firebase/contracts-service.ts`
  - `lib/firebase/payments-service.ts`
  - `lib/firebase/employees-service.ts`
- [x] Created Monday.com API wrappers:
  - `lib/monday/members-api.ts`
  - `lib/monday/contracts-api.ts`
  - `lib/monday/payments-api.ts`
  - `lib/monday/employees-api.ts`
- [x] Created unified sync manager: `lib/monday/sync-manager.ts`

### Phase 3: API Endpoints
- [x] Migrated `/api/contracts` to Firebase + auto-sync
- [x] Migrated `/api/payments` to Firebase + auto-sync
- [x] Migrated `/api/employees` to Firebase + auto-sync
- [x] Created `/api/monday/sync` unified endpoint

### Configuration Created
- [x] `.env.local` file with Firebase and Monday credentials
- [x] Monday.com configuration in `lib/monday/config.ts`

---

## 3. WHAT IS BLOCKING US ❌

### Issue 1: Firebase Permissions Error
When calling the API, we get:
```
Error: Missing or insufficient permissions.
code: 'permission-denied'
```

**Root Cause:** The app uses Firebase **Client SDK** for server-side operations. This requires either:

**Solution A (Quick - for testing):**
Update Firestore Security Rules in Firebase Console:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Solution B (Recommended - for production):**
Migrate server-side code to use **Firebase Admin SDK**:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Generate new private key (JSON file)
3. Add to `.env.local`:
   ```
   FIREBASE_ADMIN_PROJECT_ID=al-gym-central
   FIREBASE_ADMIN_CLIENT_EMAIL=<from JSON>
   FIREBASE_ADMIN_PRIVATE_KEY="<from JSON>"
   ```
4. Create `lib/firebase/admin.ts` using `firebase-admin` package
5. Update services to use Admin SDK for server operations

### Issue 2: Monday.com Column Mapping
The current column mappings in `lib/monday/config.ts` use generic IDs like `text`, `text__1`, etc.
These need to be updated to match the **actual column IDs** from the Monday board.

**Monday Board:** https://sutilde-team.monday.com/boards/18092113859

**Columns visible in the board (in Spanish):**
| Column Name (Spanish) | English Translation | Current Mapping ID | Needs Update |
|-----------------------|---------------------|-------------------|--------------|
| Estado de Membresía | Membership Status | `status` | ❓ Verify |
| Plan | Plan | `dropdown` | ❓ Verify |
| Domiciliado | Direct Debit | `dropdown__1` | ❓ Verify |
| Teléfono | Phone | `phone` | ❓ Verify |
| Correo | Email | `email` | ❓ Verify |
| Dirección | Address | (not mapped) | ❌ Add |
| Fecha de Nacimiento | Date of Birth | `date` | ❓ Verify |
| Fecha de Inicio | Start Date | `date__1` | ❓ Verify |
| Fecha de Vencimiento | Expiration Date | `date__2` | ❓ Verify |

**To get actual column IDs:**
Run this GraphQL query in Monday.com API Playground (https://monday.com/developers/v2/try-it-yourself):
```graphql
{
  boards(ids: 18092113859) {
    name
    columns {
      id
      title
      type
    }
  }
}
```

Then update `lib/monday/config.ts` → `COLUMN_MAPPINGS.members` with correct IDs.

---

## 4. CREDENTIALS (Already configured in .env.local)

### Firebase
```
Project ID: al-gym-central
API Key: AIzaSyBD-DwO4oC11jTZUL2KPgs21NVZqdtwzz0
Auth Domain: al-gym-central.firebaseapp.com
```

### Monday.com
```
API Token: eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjU0NTg4Mzg0MiwiYWFpIjoxMSwidWlkIjoxNzQzODU4OCwiaWFkIjoiMjAyNS0wOC0wMVQxODo0NzoyNy4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NzY2MDA2NSwicmduIjoidXNlMSJ9.LvuqR-VN5x3_MZhm1gGYem6Y5Ads01RSNrQB2qctw88
Members Board ID: 18092113859
```

---

## 5. IMMEDIATE TASKS FOR ZAID

### Task 1: Fix Firebase Permissions (Priority: HIGH)
Choose Solution A or B from Issue 1 above.

### Task 2: Get Monday Column IDs (Priority: HIGH)
1. Run the GraphQL query above
2. Update `lib/monday/config.ts` with actual column IDs
3. The mapping should look like:
```typescript
members: {
  status: 'actual_status_column_id',
  email: 'actual_email_column_id',
  phone: 'actual_phone_column_id',
  // ... etc
}
```

### Task 3: Test Basic Sync (Priority: HIGH)
Once permissions are fixed and columns mapped:
```bash
# Start the server
npm run dev

# Test listing members
curl http://localhost:3000/api/members

# Test creating a member
curl -X POST http://localhost:3000/api/members \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "paternal_last_name": "User",
    "email": "test@example.com",
    "primary_phone": "5551234567",
    "status": "active"
  }'

# Check Monday.com board - member should appear there
```

### Task 4: Test Webhook (Priority: MEDIUM)
1. Use ngrok or similar to expose localhost
2. Configure webhook in Monday.com to point to `https://your-ngrok-url/api/webhook/monday`
3. Update a member in Monday.com
4. Verify it syncs to Firebase

---

## 6. KEY FILES TO UNDERSTAND

| File | Purpose |
|------|---------|
| `lib/monday/config.ts` | Configuration, column mappings, API settings |
| `lib/monday/sync-manager.ts` | Orchestrates all sync operations |
| `lib/monday/members-api.ts` | Monday GraphQL API wrapper for members |
| `lib/firebase/members-service.ts` | Firebase CRUD operations for members |
| `app/api/members/route.ts` | REST API endpoint for members |
| `app/api/monday/sync/route.ts` | Manual sync trigger endpoint |
| `app/api/webhook/monday/route.ts` | Receives webhooks from Monday |
| `.env.local` | Environment variables (DO NOT COMMIT) |

---

## 7. ARCHITECTURE DIAGRAM

```
┌─────────────────┐         ┌─────────────────┐
│   Next.js App   │         │   Monday.com    │
│   (Frontend)    │         │   (Boards)      │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│  API Routes     │◄───────►│  Webhooks       │
│  /api/members   │         │  /api/webhook   │
└────────┬────────┘         └────────┬────────┘
         │                           │
         ▼                           ▼
┌─────────────────────────────────────────────┐
│            Sync Manager                      │
│   lib/monday/sync-manager.ts                 │
└──────────────────┬──────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌─────────────────┐ ┌─────────────────┐
│ Firebase Service│ │ Monday API      │
│ (Firestore)     │ │ (GraphQL)       │
└─────────────────┘ └─────────────────┘
```

---

## 8. FUTURE PHASES (After Members works)

### Phase 4: Additional Boards
Create these boards in Monday.com:
1. **Contratos** (Contracts)
2. **Pagos** (Payments)
3. **Empleados** (Employees)

Each board needs similar columns and the board IDs added to `.env.local`.

### Phase 5: Admin UI
Create a sync dashboard in the app showing:
- Sync status for each entity
- Last sync timestamp
- Errors and retry options
- Manual sync buttons

### Phase 6: Production Deployment
- Set up proper Firestore security rules
- Configure production webhooks
- Set up error monitoring (Sentry, etc.)
- Rate limiting and retry logic

---

## 9. COMMANDS REFERENCE

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Check sync status
curl http://localhost:3000/api/monday/sync

# Trigger full sync
curl -X POST http://localhost:3000/api/monday/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "full"}'

# Sync single member to Monday
curl -X POST http://localhost:3000/api/monday/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "single", "entity": "members", "id": "FIREBASE_DOC_ID"}'
```

---

## 10. CONTACT & RESOURCES

- **Monday.com API Docs:** https://developer.monday.com/api-reference/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Git Branch:** `claude/plan-monday-integration-8d65T`

---

**Last Updated:** January 2026
**Previous Developer Notes:** See `/root/.claude/plans/whimsical-yawning-turing.md` for detailed technical plan
