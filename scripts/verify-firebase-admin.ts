/**
 * Verify Firebase Admin SDK connectivity.
 *
 * Usage:
 *   npx tsx scripts/verify-firebase-admin.ts
 *
 * Requires FIREBASE_ADMIN_CREDENTIAL_PATH or GOOGLE_APPLICATION_CREDENTIALS
 * to point to a valid service account JSON file.
 */

import { readFileSync } from 'fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  // Load credential path from .env.local if not already set
  const envLocalPath = new URL('../.env.local', import.meta.url).pathname
  try {
    const envContent = readFileSync(envLocalPath, 'utf8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx)
      const value = trimmed.slice(eqIdx + 1)
      if (!process.env[key] && value) {
        process.env[key] = value
      }
    }
  } catch {
    // .env.local not found, rely on existing env vars
  }

  const credPath = process.env.FIREBASE_ADMIN_CREDENTIAL_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (!credPath) {
    console.error('ERROR: No credential path set. Set FIREBASE_ADMIN_CREDENTIAL_PATH or GOOGLE_APPLICATION_CREDENTIALS.')
    process.exit(1)
  }

  console.log('Loading service account from:', credPath)
  const serviceAccount = JSON.parse(readFileSync(credPath, 'utf8'))
  console.log('Project ID:', serviceAccount.project_id)
  console.log('Client email:', serviceAccount.client_email)

  // Initialize
  const app = getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0]

  const db = getFirestore(app)

  // List top-level collections
  console.log('\n--- Firestore Collections ---')
  const collections = await db.listCollections()
  if (collections.length === 0) {
    console.log('(no collections found — Firestore may be empty or rules may restrict listing)')
  } else {
    for (const col of collections) {
      const snapshot = await col.limit(1).get()
      const count = snapshot.size
      console.log(`  ${col.id}  (sample docs: ${count})`)
    }
  }

  // Try reading members collection (first 3 docs, only IDs and status)
  console.log('\n--- Members sample (max 3, safe fields only) ---')
  const membersSnap = await db.collection('members').limit(3).get()
  if (membersSnap.empty) {
    console.log('(no members found)')
  } else {
    for (const doc of membersSnap.docs) {
      const d = doc.data()
      console.log(`  id=${doc.id}  status=${d.status ?? 'n/a'}  name=${d.first_name ?? d.name ?? 'n/a'}`)
    }
  }

  console.log('\nFirebase Admin SDK: CONNECTED SUCCESSFULLY')
}

main().catch((err) => {
  console.error('Firebase verification failed:', err.message)
  process.exit(1)
})
