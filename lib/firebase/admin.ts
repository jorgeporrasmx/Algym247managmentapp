import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { readFileSync } from 'fs'

function getCredential() {
  // Option 1: Load from a service account JSON file path
  const credPath = process.env.FIREBASE_ADMIN_CREDENTIAL_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credPath) {
    const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'))
    return cert(serviceAccount)
  }

  // Option 2: Individual env vars (e.g. for Vercel / serverless)
  if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  }

  // Option 3: Application Default Credentials (GCP environments)
  return applicationDefault()
}

let adminApp: App

// Initialize Firebase Admin SDK
if (getApps().length === 0) {
  adminApp = initializeApp({ credential: getCredential() })
} else {
  adminApp = getApps()[0]
}

export const adminDb = getFirestore(adminApp)
export const adminAuth = getAuth(adminApp)

// Enable Firestore settings
adminDb.settings({ ignoreUndefinedProperties: true })

export default adminApp