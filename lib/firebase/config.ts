import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getAuth, Auth } from 'firebase/auth'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
}

// Check if Firebase is properly configured
const isFirebaseConfigured = firebaseConfig.apiKey &&
  firebaseConfig.apiKey.length > 10 &&
  !firebaseConfig.apiKey.includes('placeholder') &&
  firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('placeholder')

let _app: FirebaseApp | null = null
let _db: Firestore | null = null
let _auth: Auth | null = null
let _storage: FirebaseStorage | null = null

function ensureInitialized() {
  if (_app) return
  if (!isFirebaseConfigured) {
    throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  }
  _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  _db = getFirestore(_app)
  _auth = getAuth(_app)
  _storage = getStorage(_app)
}

// Lazy getters — only throw when actually accessed at runtime, not at import/build time
export const db: Firestore = new Proxy({} as Firestore, {
  get(_, prop) { ensureInitialized(); return (_db as never)[prop] }
})
export const auth: Auth = new Proxy({} as Auth, {
  get(_, prop) { ensureInitialized(); return (_auth as never)[prop] }
})
export const storage: FirebaseStorage = new Proxy({} as FirebaseStorage, {
  get(_, prop) { ensureInitialized(); return (_storage as never)[prop] }
})

const app: FirebaseApp = new Proxy({} as FirebaseApp, {
  get(_, prop) { ensureInitialized(); return (_app as never)[prop] }
})
export default app