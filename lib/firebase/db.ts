/**
 * Firebase Database Utility
 * Replacement for Supabase client
 * 
 * This module provides a unified interface for database operations
 * that mirrors Supabase's API while using Firebase Firestore.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  QueryConstraint,
  DocumentData,
  WhereFilterOp
} from 'firebase/firestore'
import { db } from './config'

export interface QueryOptions {
  filters?: Array<{
    field: string
    operator: WhereFilterOp
    value: unknown
  }>
  orderByField?: string
  orderDirection?: 'asc' | 'desc'
  limitCount?: number
}

/**
 * Get all documents from a collection with optional filters
 */
export async function getAll<T>(
  collectionName: string, 
  options?: QueryOptions
): Promise<{ data: T[] | null; error: Error | null }> {
  try {
    const constraints: QueryConstraint[] = []
    
    if (options?.filters) {
      for (const filter of options.filters) {
        constraints.push(where(filter.field, filter.operator, filter.value))
      }
    }
    
    if (options?.orderByField) {
      constraints.push(orderBy(options.orderByField, options.orderDirection || 'asc'))
    }
    
    if (options?.limitCount) {
      constraints.push(limit(options.limitCount))
    }
    
    const q = constraints.length > 0 
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName)
    
    const snapshot = await getDocs(q)
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[]
    
    return { data, error: null }
  } catch (error) {
    console.error(`[Firebase] Error getting ${collectionName}:`, error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get a single document by ID
 */
export async function getById<T>(
  collectionName: string, 
  id: string
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const docRef = doc(db, collectionName, id)
    const docSnap = await getDoc(docRef)
    
    if (!docSnap.exists()) {
      return { data: null, error: null }
    }
    
    const data = {
      id: docSnap.id,
      ...docSnap.data()
    } as T
    
    return { data, error: null }
  } catch (error) {
    console.error(`[Firebase] Error getting ${collectionName}/${id}:`, error)
    return { data: null, error: error as Error }
  }
}

/**
 * Get document by a specific field value
 */
export async function getByField<T>(
  collectionName: string,
  field: string,
  value: unknown
): Promise<{ data: T | null; error: Error | null }> {
  try {
    const q = query(
      collection(db, collectionName),
      where(field, '==', value),
      limit(1)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return { data: null, error: null }
    }
    
    const doc = snapshot.docs[0]
    const data = {
      id: doc.id,
      ...doc.data()
    } as T
    
    return { data, error: null }
  } catch (error) {
    console.error(`[Firebase] Error getting ${collectionName} by ${field}:`, error)
    return { data: null, error: error as Error }
  }
}

/**
 * Create a new document
 */
export async function create<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<{ data: { id: string } | null; error: Error | null }> {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    return { data: { id: docRef.id }, error: null }
  } catch (error) {
    console.error(`[Firebase] Error creating in ${collectionName}:`, error)
    return { data: null, error: error as Error }
  }
}

/**
 * Update a document by ID
 */
export async function update(
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<{ error: Error | null }> {
  try {
    const docRef = doc(db, collectionName, id)
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    })
    
    return { error: null }
  } catch (error) {
    console.error(`[Firebase] Error updating ${collectionName}/${id}:`, error)
    return { error: error as Error }
  }
}

/**
 * Update document by a specific field value (like monday_member_id)
 */
export async function updateByField(
  collectionName: string,
  field: string,
  fieldValue: unknown,
  data: Partial<DocumentData>
): Promise<{ error: Error | null }> {
  try {
    const q = query(
      collection(db, collectionName),
      where(field, '==', fieldValue),
      limit(1)
    )
    
    const snapshot = await getDocs(q)
    
    if (snapshot.empty) {
      return { error: new Error(`Document not found with ${field}=${fieldValue}`) }
    }
    
    const docRef = snapshot.docs[0].ref
    await updateDoc(docRef, {
      ...data,
      updated_at: new Date().toISOString()
    })
    
    return { error: null }
  } catch (error) {
    console.error(`[Firebase] Error updating ${collectionName} by ${field}:`, error)
    return { error: error as Error }
  }
}

/**
 * Delete a document by ID
 */
export async function remove(
  collectionName: string,
  id: string
): Promise<{ error: Error | null }> {
  try {
    const docRef = doc(db, collectionName, id)
    await deleteDoc(docRef)
    
    return { error: null }
  } catch (error) {
    console.error(`[Firebase] Error deleting ${collectionName}/${id}:`, error)
    return { error: error as Error }
  }
}

/**
 * Supabase-compatible wrapper
 * Allows gradual migration by mimicking Supabase's API
 */
export function from(collectionName: string) {
  return {
    select: () => ({
      eq: async (field: string, value: unknown) => {
        const result = await getAll(collectionName, {
          filters: [{ field, operator: '==', value }]
        })
        return result
      },
      single: async () => {
        const result = await getAll(collectionName, { limitCount: 1 })
        return {
          data: result.data?.[0] || null,
          error: result.error
        }
      },
      order: (field: string, options?: { ascending?: boolean }) => ({
        limit: async (count: number) => {
          const result = await getAll(collectionName, {
            orderByField: field,
            orderDirection: options?.ascending === false ? 'desc' : 'asc',
            limitCount: count
          })
          return result
        }
      })
    }),
    insert: async (data: DocumentData | DocumentData[]) => {
      if (Array.isArray(data)) {
        const results = await Promise.all(
          data.map(item => create(collectionName, item))
        )
        const errors = results.filter(r => r.error)
        return {
          data: results.map(r => r.data),
          error: errors.length > 0 ? errors[0].error : null
        }
      }
      return create(collectionName, data)
    },
    update: (data: Partial<DocumentData>) => ({
      eq: async (field: string, value: unknown) => {
        if (field === 'id') {
          return update(collectionName, value as string, data)
        }
        return updateByField(collectionName, field, value, data)
      }
    }),
    delete: () => ({
      eq: async (field: string, value: unknown) => {
        if (field === 'id') {
          return remove(collectionName, value as string)
        }
        // For other fields, find and delete
        const result = await getByField<{ id: string }>(collectionName, field, value)
        if (result.data && typeof result.data === 'object' && result.data !== null && 'id' in result.data) {
          return remove(collectionName, result.data.id)
        }
        return { error: new Error('Document not found') }
      }
    })
  }
}

// Export collections
export const Collections = {
  MEMBERS: 'members',
  CONTRACTS: 'contracts',
  PAYMENTS: 'payments',
  PRODUCTS: 'products',
  SCHEDULE: 'schedule',
  BOOKINGS: 'bookings',
  SALES: 'sales',
  EMPLOYEES: 'employees',
  WEBHOOK_LOGS: 'webhook_logs',
  SYNC_LOGS: 'sync_logs'
}
