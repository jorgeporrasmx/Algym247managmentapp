// Legacy Supabase client - DEPRECATED
// All functionality has been migrated to Firebase.
// This file is kept as a stub for backwards compatibility.

export function createClient() {
  console.warn('Supabase client is deprecated. Use Firebase services instead.')

  const mockClient = {
    auth: {
      signInWithPassword: async () => ({
        data: { user: null, session: null },
        error: new Error('Supabase is deprecated. Use Firebase Auth.')
      }),
      signOut: async () => ({ error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({
        data: {
          subscription: {
            unsubscribe: () => {}
          }
        }
      }),
      signUp: async () => ({
        data: { user: null, session: null },
        error: new Error('Supabase is deprecated. Use Firebase Auth.')
      })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') }),
      update: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') }),
      delete: () => Promise.resolve({ data: null, error: new Error('Use Firebase services') })
    })
  }
  return mockClient as never
}
