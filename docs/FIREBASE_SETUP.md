# 🔥 Configuración de Firebase y Migración desde Supabase

## 📋 Requisitos Previos

1. Cuenta de Google
2. Proyecto existente con Supabase (para migración)
3. Cuenta en Monday.com con API token

## 🚀 Paso 1: Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Click en "Crear proyecto"
3. Nombre del proyecto: `algym-247` (o tu preferencia)
4. Habilita Google Analytics (opcional)
5. Espera a que se cree el proyecto

## 🔧 Paso 2: Configurar Firebase Services

### Firestore Database
1. En Firebase Console, ve a **Firestore Database**
2. Click en "Crear base de datos"
3. Selecciona modo **Producción** 
4. Elige la ubicación más cercana (ej: `us-central1`)
5. Click en "Habilitar"

### Authentication
1. Ve a **Authentication** en la consola
2. Click en "Comenzar"
3. Habilita los métodos de autenticación:
   - Email/Password
   - Google (opcional)

### Storage (opcional, para contratos)
1. Ve a **Storage**
2. Click en "Comenzar"
3. Acepta las reglas de seguridad predeterminadas

## 🔑 Paso 3: Obtener Credenciales

### Credenciales del Cliente (Web App)
1. En Firebase Console, click en el ícono de engranaje ⚙️
2. Selecciona "Configuración del proyecto"
3. En la pestaña "General", scroll hasta "Tus aplicaciones"
4. Click en el ícono de Web (`</>`)
5. Registra tu app con un nombre (ej: "Algym Web")
6. Copia la configuración que aparece:

```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

### Service Account (Admin SDK)
1. En "Configuración del proyecto"
2. Ve a la pestaña "Cuentas de servicio"
3. Click en "Generar nueva clave privada"
4. Descarga el archivo JSON
5. Extrae los valores necesarios del JSON

## 📝 Paso 4: Configurar Variables de Entorno

Actualiza tu archivo `.env.local` con las credenciales obtenidas:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=tu-api-key-aqui
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=tu-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=tu-measurement-id

# Firebase Admin SDK
FIREBASE_ADMIN_PROJECT_ID=tu-proyecto-id
FIREBASE_ADMIN_CLIENT_EMAIL=tu-service-account@tu-proyecto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ntu-private-key-aqui\n-----END PRIVATE KEY-----"

# Monday.com Configuration
MONDAY_API_TOKEN=tu-monday-api-token
MONDAY_MEMBERS_BOARD_ID=tu-board-id-de-socios
MONDAY_INVENTORY_BOARD_ID=9944534259
```

## 🔄 Paso 5: Configurar Monday.com Board para Socios

### Crear Board en Monday
1. Accede a tu cuenta de Monday.com
2. Crea un nuevo board llamado "Gestión de Socios"
3. Configura las siguientes columnas:
   - `text`: Nombre
   - `text__1`: Apellido Paterno
   - `text__2`: Apellido Materno
   - `email`: Correo Electrónico
   - `phone`: Teléfono Principal
   - `phone__1`: Teléfono Secundario
   - `date`: Fecha de Nacimiento
   - `status`: Estado (active, inactive, pending, suspended)
   - `dropdown`: Plan Seleccionado
   - `numbers`: Monto Mensual
   - `date__1`: Fecha de Inicio
   - `date__2`: Fecha de Expiración
   - `text__3`: Ciudad
   - `text__4`: Estado
   - `text__5`: Empleado
   - `dropdown__1`: Domiciliación (Domiciliado/No domiciliado)

### Obtener Board ID
1. Abre el board en Monday
2. La URL será algo como: `https://your-account.monday.com/boards/1234567890`
3. Copia el número (1234567890) - ese es tu Board ID
4. Actualiza `MONDAY_MEMBERS_BOARD_ID` en `.env.local`

## 🚀 Paso 6: Migración de Datos

### Preparar la migración
1. Asegúrate de tener las credenciales de Supabase en `.env.local`
2. Instala las dependencias necesarias:
```bash
npm install dotenv tsx
```

### Ejecutar la migración
```bash
npx tsx scripts/migrate-to-firebase.ts
```

La migración:
- Descargará todos los socios de Supabase
- Los convertirá al formato de Firebase
- Los subirá a Firestore
- Evitará duplicados basándose en el email
- Mostrará un resumen al final

## 🔒 Paso 7: Configurar Reglas de Seguridad en Firestore

Ve a Firestore > Reglas y configura:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura a usuarios autenticados
    match /members/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.admin == true;
    }
    
    // Logs de sincronización (solo lectura)
    match /sync_logs/{document=**} {
      allow read: if request.auth != null;
      allow write: if false; // Solo el servidor puede escribir
    }
  }
}
```

## 🔄 Paso 8: Configurar Webhook en Monday

### En Monday.com:
1. Ve a tu perfil > Developers > Apps
2. Crea una nueva app
3. En Features, habilita "Webhooks"
4. Agrega un nuevo webhook:
   - URL: `https://tu-dominio.com/api/webhook/monday/members`
   - Eventos: `change_column_value`, `create_item`, `delete_item`
5. Copia el signing secret y agrégalo a `.env.local`:
```env
MONDAY_WEBHOOK_SECRET=tu-webhook-secret
```

## 🧪 Paso 9: Probar la Integración

### 1. Verificar conexión con Firebase
```bash
npm run dev
# Visita: http://localhost:3000/members
```

### 2. Probar sincronización con Monday
```bash
# Sincronización manual
curl -X POST http://localhost:3000/api/monday/members/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "bidirectional"}'
```

### 3. Crear un socio de prueba
- Ve a http://localhost:3000/members/add
- Completa el formulario
- Verifica que aparezca en:
  - Firebase Console (Firestore)
  - Monday.com Board

## 📊 Paso 10: Monitoreo

### Firebase Console
- **Firestore**: Ver documentos en la colección `members`
- **Usage**: Monitorear lecturas/escrituras
- **Logs**: Ver errores en Cloud Functions (cuando se configuren)

### Monday.com
- Verificar que los items se crean/actualizan correctamente
- Revisar el historial de actividad del board

## 🚨 Solución de Problemas

### Error: "Firebase credentials not found"
- Verifica que todas las variables de entorno estén configuradas
- Reinicia el servidor de desarrollo

### Error: "Monday API error"
- Verifica el API token de Monday
- Confirma que el Board ID es correcto
- Revisa que las columnas del board coincidan con el mapeo

### Migración falla
- Verifica las credenciales de Supabase
- Asegúrate de que Firebase esté inicializado correctamente
- Revisa los logs para ver qué miembro específico falla

## 🎯 Próximos Pasos

1. **Cloud Functions**: Configurar triggers automáticos
2. **Backup**: Implementar backup automático de Firestore
3. **Analytics**: Configurar Firebase Analytics
4. **Performance**: Implementar índices en Firestore
5. **Seguridad**: Refinar las reglas de seguridad

## 📚 Recursos Útiles

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
- [Monday.com API](https://developer.monday.com/api-reference/docs)
- [Next.js with Firebase](https://firebase.google.com/codelabs/firebase-nextjs)

## 💡 Tips

1. **Desarrollo Local**: Usa el emulador de Firebase para desarrollo
2. **Costos**: Monitorea el uso para evitar sorpresas en la factura
3. **Índices**: Crea índices para las consultas más comunes
4. **Cache**: Implementa cache en el cliente para reducir lecturas
5. **Batch Operations**: Usa operaciones batch para múltiples escrituras