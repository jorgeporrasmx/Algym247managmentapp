#!/usr/bin/env node

/**
 * Migration script from Supabase to Firebase
 * 
 * Usage:
 * 1. Set up your .env.local with both Supabase and Firebase credentials
 * 2. Run: npx tsx scripts/migrate-to-firebase.ts
 */

import { createClient } from '@supabase/supabase-js'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Initialize Firebase Admin
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const firestore = getFirestore(firebaseApp)
firestore.settings({ ignoreUndefinedProperties: true })

// Migration statistics
let stats = {
  total: 0,
  migrated: 0,
  failed: 0,
  skipped: 0,
  errors: [] as string[]
}

// Convert Supabase date string to Firebase Timestamp
function toFirebaseDate(dateString: string | null): Timestamp | null {
  if (!dateString) return null
  try {
    return Timestamp.fromDate(new Date(dateString))
  } catch (error) {
    console.warn(`Failed to convert date: ${dateString}`)
    return null
  }
}

// Convert Supabase member to Firebase format
function convertMember(supabaseMember: any): any {
  return {
    // IDs
    supabase_id: supabaseMember.id,
    monday_item_id: supabaseMember.monday_member_id || null,
    member_id: supabaseMember.member_id || null,
    
    // Personal Information
    first_name: supabaseMember.first_name || '',
    paternal_last_name: supabaseMember.paternal_last_name || '',
    maternal_last_name: supabaseMember.maternal_last_name || null,
    name: supabaseMember.name || `${supabaseMember.first_name} ${supabaseMember.paternal_last_name}`.trim(),
    email: supabaseMember.email,
    primary_phone: supabaseMember.primary_phone || supabaseMember.phone,
    secondary_phone: supabaseMember.secondary_phone || null,
    date_of_birth: toFirebaseDate(supabaseMember.date_of_birth),
    
    // Address
    address_1: supabaseMember.address_1 || null,
    city: supabaseMember.city || null,
    state: supabaseMember.state || null,
    zip_code: supabaseMember.zip_code || null,
    
    // Membership
    status: supabaseMember.status || 'active',
    selected_plan: supabaseMember.selected_plan || null,
    monthly_amount: supabaseMember.monthly_amount ? parseFloat(supabaseMember.monthly_amount) : null,
    start_date: toFirebaseDate(supabaseMember.start_date),
    expiration_date: toFirebaseDate(supabaseMember.expiration_date),
    access_type: supabaseMember.access_type || null,
    
    // References
    employee: supabaseMember.employee || null,
    referred_member: supabaseMember.referred_member || null,
    
    // Payment
    direct_debit: supabaseMember.direct_debit || 'No domiciliado',
    
    // Other
    person: supabaseMember.person || null,
    how_did_you_hear: supabaseMember.how_did_you_hear || null,
    contract_link: supabaseMember.contract_link || null,
    
    // Emergency Contact
    emergency_contact_name: supabaseMember.emergency_contact_name || null,
    emergency_contact_phone: supabaseMember.emergency_contact_phone || null,
    
    // Metadata
    created_at: toFirebaseDate(supabaseMember.created_at) || Timestamp.now(),
    updated_at: toFirebaseDate(supabaseMember.updated_at) || Timestamp.now(),
    version: supabaseMember.version || '1.0',
    
    // Sync status
    sync_status: 'pending',
    migrated_from_supabase: true,
    migration_date: Timestamp.now()
  }
}

// Main migration function
async function migrate() {
  console.log('🚀 Starting migration from Supabase to Firebase...\n')
  
  try {
    // Step 1: Fetch all members from Supabase
    console.log('📥 Fetching members from Supabase...')
    const { data: members, error } = await supabase
      .from('members')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error('❌ Error fetching members from Supabase:', error)
      process.exit(1)
    }
    
    if (!members || members.length === 0) {
      console.log('ℹ️  No members found in Supabase')
      return
    }
    
    stats.total = members.length
    console.log(`✅ Found ${stats.total} members in Supabase\n`)
    
    // Step 2: Migrate each member to Firebase
    console.log('📤 Migrating members to Firebase...')
    const batch = firestore.batch()
    let batchCount = 0
    const BATCH_SIZE = 500 // Firebase batch limit
    
    for (const member of members) {
      try {
        // Check if member already exists in Firebase (by email)
        const existingQuery = await firestore
          .collection('members')
          .where('email', '==', member.email)
          .limit(1)
          .get()
        
        if (!existingQuery.empty) {
          console.log(`⏭️  Skipping ${member.name || member.email} - already exists`)
          stats.skipped++
          continue
        }
        
        // Convert and add to batch
        const firebaseMember = convertMember(member)
        const docRef = firestore.collection('members').doc()
        batch.set(docRef, firebaseMember)
        batchCount++
        
        console.log(`✅ Migrating ${member.name || member.email}`)
        stats.migrated++
        
        // Commit batch if it reaches the limit
        if (batchCount >= BATCH_SIZE) {
          await batch.commit()
          console.log(`💾 Committed batch of ${batchCount} members`)
          batchCount = 0
        }
      } catch (error) {
        console.error(`❌ Failed to migrate ${member.name || member.email}:`, error)
        stats.failed++
        stats.errors.push(`${member.email}: ${error}`)
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit()
      console.log(`💾 Committed final batch of ${batchCount} members`)
    }
    
    // Step 3: Display migration summary
    console.log('\n' + '='.repeat(50))
    console.log('📊 Migration Summary')
    console.log('='.repeat(50))
    console.log(`Total members: ${stats.total}`)
    console.log(`✅ Migrated: ${stats.migrated}`)
    console.log(`⏭️  Skipped (already exists): ${stats.skipped}`)
    console.log(`❌ Failed: ${stats.failed}`)
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:')
      stats.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    console.log('\n✨ Migration completed!')
    
    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...')
    const firebaseMembers = await firestore.collection('members').count().get()
    console.log(`📦 Total members in Firebase: ${firebaseMembers.data().count}`)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n👋 Goodbye!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })