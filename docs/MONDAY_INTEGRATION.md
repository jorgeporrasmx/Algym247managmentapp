# Monday.com Integration - AlGym Management Software

## Board IDs Configurados

| Board | ID | Uso |
|-------|-----|-----|
| Gestión de Socios | 18092113859 | Miembros/Contratos |
| Ventas de artículos | 9944534259 | Productos/Inventario |
| Objetivos Al Gym 2026 | 18397194216 | KPIs y Metas |

## Mapeo de Columnas - Gestión de Socios

### Datos Personales
| Column ID | Título | Tipo | Uso en App |
|-----------|--------|------|------------|
| `name` | Name | name | Nombre completo |
| `text_mkwb3jhc` | Nombre | text | Primer nombre |
| `text_mkwb3cr9` | Apellido Paterno | text | Apellido |
| `text_mkwbcny3` | Apellido Materno | text | Segundo apellido |
| `phone_mkwaaa5n` | Teléfono | phone | Contacto principal |
| `long_text_mkwb9yh5` | Correo | long_text | Email |
| `date_mkwa3hre` | Fecha de Nacimiento | date | Cumpleaños |

### Membresía
| Column ID | Título | Tipo | Uso en App |
|-----------|--------|------|------------|
| `color_mkwaxzng` | Estado de Membresía | status | Activo/Inactivo/Vencido |
| `color_mkwb67p6` | Plan | status | Tipo de membresía |
| `date_mkwac0x5` | Fecha de Inicio | date | Inicio contrato |
| `date_mkwa98h` | Fecha de Vencimiento | date | Fin contrato |
| `text_mkwbp91v` | Monto | text | Precio mensual |
| `text_mkwbd9d` | ID Socio | text | Identificador único |

### Pagos
| Column ID | Título | Tipo | Uso en App |
|-----------|--------|------|------------|
| `color_mkwb9cmt` | Domiciliado | status | Pago automático |
| `date_mkwah0ms` | Fecha de Pago | date | Último pago |
| `dropdown_mkwapy8v` | Método de Pago | dropdown | Efectivo/Tarjeta/Transfer |
| `boolean_mkwanv55` | Renovación Automática | checkbox | Auto-renewal |

### Otros
| Column ID | Título | Tipo |
|-----------|--------|------|
| `link_mkwbrn8j` | Contrato | link |
| `long_text_mkwa8nbm` | Notas | long_text |
| `pulse_id_mkwftmfz` | Item ID | item_id |

## Cambios Necesarios en el Código

### 1. Actualizar `app/api/webhook/monday/route.ts`

```typescript
// Reemplazar estos placeholders:
const MEMBERS_BOARD_ID = 18092113859  // Era: 123456789
const CONTRACTS_BOARD_ID = 18092113859 // Mismo board, diferentes grupos
const PRODUCTS_BOARD_ID = 9944534259  // Ya correcto
```

### 2. Actualizar mapeo de columnas

```typescript
// En handleMemberColumnUpdate, actualizar switch cases:
switch (payload.columnId) {
  case "long_text_mkwb9yh5":  // Era: "email"
    if (payload.value?.text) {
      updateData.email = payload.value.text
    }
    break
  case "phone_mkwaaa5n":  // Era: "phone"
    if (payload.value?.phone) {
      updateData.phone = payload.value.phone
    }
    break
  case "color_mkwaxzng":  // Era: "status"
    if (payload.value?.label?.text) {
      updateData.status = payload.value.label.text.toLowerCase()
    }
    break
  // ... etc
}
```

### 3. Variables de Entorno Necesarias

```env
# Monday.com
MONDAY_API_KEY=eyJhbGci...
MONDAY_MEMBERS_BOARD_ID=18092113859
MONDAY_PRODUCTS_BOARD_ID=9944534259

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...
```

## Configurar Webhooks en Monday.com

1. Ir a Monday.com → Tablero "Gestión de Socios"
2. Click en "Integrations" → "Webhooks"
3. Crear webhook para:
   - **URL**: `https://[tu-dominio]/api/webhook/monday`
   - **Events**: `create_item`, `change_column_value`
4. Repetir para tablero de Productos

## Próximos Pasos

1. [ ] Configurar Firebase Console (ver FIREBASE_SETUP.md)
2. [ ] Actualizar Board IDs en código
3. [ ] Actualizar mapeo de columnas
4. [ ] Configurar variables de entorno en Vercel
5. [ ] Configurar webhooks en Monday.com
6. [ ] Probar sincronización bidireccional

---
*Documentación generada por Juan - 2026-02-13*
