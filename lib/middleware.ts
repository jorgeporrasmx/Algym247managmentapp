import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // Always allow API routes to pass through
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Always allow auth pages
  if (request.nextUrl.pathname.startsWith("/auth")) {
    return NextResponse.next()
  }

  // Check for dev-session cookie (works in both dev and production)
  const devSession = request.cookies.get('dev-session')

  // Check for employee session in cookies
  const employeeSession = request.cookies.get('employee-session')

  // Allow access to home page (AuthProvider handles redirect on client side)
  if (request.nextUrl.pathname === "/") {
    return NextResponse.next()
  }

  // If no session and not on an allowed page, redirect to login
  if (!devSession && !employeeSession) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
