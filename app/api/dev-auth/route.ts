import { NextResponse } from 'next/server'

// Development-only authentication endpoint
// Credentials are loaded from environment variables for security
function getDemoUsers() {
  const adminPassword = process.env.DEV_DEMO_ADMIN_PASSWORD
  const userPassword = process.env.DEV_DEMO_USER_PASSWORD

  if (!adminPassword || !userPassword) {
    return null
  }

  return {
    'admin@demo.com': { password: adminPassword, role: 'admin', name: 'Demo Admin' },
    'user@demo.com': { password: userPassword, role: 'user', name: 'Demo User' }
  }
}

export async function POST(request: Request) {
  try {
    // Check if we're in development mode
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    const DEMO_USERS = getDemoUsers()

    if (!DEMO_USERS) {
      return NextResponse.json(
        { error: 'Demo credentials not configured. Set DEV_DEMO_ADMIN_PASSWORD and DEV_DEMO_USER_PASSWORD in .env' },
        { status: 500 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { email, password } = body

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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 // 24 hours
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}