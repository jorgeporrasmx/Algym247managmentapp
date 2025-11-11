import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey || 
      supabaseUrl === 'https://your-project.supabase.co' || 
      supabaseAnonKey === 'your-anon-key-here') {
    console.warn('⚠️ Supabase credentials not configured properly')
    console.warn('Please update your .env.local file with valid Supabase credentials')
    
    // Return a mock client for development
    const mockClient = {
      auth: {
        signInWithPassword: async () => ({ 
          data: { user: null, session: null },
          error: new Error('Supabase is not configured. Please set up your environment variables.') 
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
        })
      },
      from: () => ({
        select: () => Promise.resolve({ data: [], error: null }),
        insert: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
        update: () => Promise.resolve({ data: null, error: new Error('Mock client') }),
        delete: () => Promise.resolve({ data: null, error: new Error('Mock client') })
      })
    }
    return mockClient as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
