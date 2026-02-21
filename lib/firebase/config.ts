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

let app: FirebaseApp
let db: Firestore
let auth: Auth
let storage: FirebaseStorage

if (!isFirebaseConfigured) {
  throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
}

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  db = getFirestore(app)
  auth = getAuth(app)
  storage = getStorage(app)
} catch (error) {
  console.error('Firebase initialization failed:', error)
  throw error
}

export { db, auth, storage }
export default app