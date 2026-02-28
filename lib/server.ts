// Legacy Supabase server client - DEPRECATED
// All functionality has been migrated to Firebase.
// This file is kept as a stub for backwards compatibility.

export async function createClient() {
  console.warn('Supabase server client is deprecated. Use Firebase services instead.')

  const mockClient = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') }),
      update: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') })
    })
  }
  return mockClient as never
}
