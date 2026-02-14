import { NextResponse } from 'next/server'

// Development-only authentication endpoint
// This simulates authentication without requiring Supabase
const DEMO_USERS = {
  'admin@demo.com': { password: 'admin123', role: 'admin', name: 'Demo Admin' },
  'user@demo.com': { password: 'user123', role: 'user', name: 'Demo User' }
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    // Check if we're in development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    // Validate credentials
    const user = DEMO_USERS[email as keyof typeof DEMO_USERS]
    
    if (!user || user.password !== password) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Create a mock session
    const session = {
      user: {
        email,
        name: user.name,
        role: user.role,
        id: Math.random().toString(36).substr(2, 9)
      },
      token: 'dev-token-' + Math.random().toString(36).substr(2, 9),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    }

    // Set a cookie for the session
    const response = NextResponse.json({ success: true, session })
    response.cookies.set('dev-session', JSON.stringify(session), {
      httpOnly: true,
      secure: false, // Dev-only endpoint, always non-secure
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return response
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}