"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function TestAuthPage() {
  const [session, setSession] = useState<{
    user: { email: string; name: string; role: string; id: string };
    token: string;
    expiresAt: string;
  } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // Check for dev session
    const devSessionStr = localStorage.getItem("devSession")
    if (devSessionStr) {
      try {
        const devSession = JSON.parse(devSessionStr)
        setSession(devSession)
        setIsAuthenticated(true)
      } catch (e) {
        console.error("Error parsing session:", e)
        setIsAuthenticated(false)
      }
    } else {
      setIsAuthenticated(false)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("devSession")
    setSession(null)
    setIsAuthenticated(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
          <CardDescription>
            Testing the authentication flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Authentication Status:</p>
            <p className={`text-lg font-bold ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
              {isAuthenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'}
            </p>
          </div>

          {session && (
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Session Details:</p>
              <div className="text-xs space-y-1">
                <p>Email: {session.user?.email}</p>
                <p>Name: {session.user?.name}</p>
                <p>Role: {session.user?.role}</p>
                <p>User ID: {session.user?.id}</p>
                <p>Expires: {new Date(session.expiresAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {!isAuthenticated ? (
              <Button asChild className="w-full">
                <Link href="/auth/login">Go to Login</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="default" className="flex-1">
                  <Link href="/">Go to Dashboard</Link>
                </Button>
                <Button variant="outline" onClick={handleLogout} className="flex-1">
                  Logout
                </Button>
              </>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            This is a test page to verify authentication is working properly.
            <br />
            Try logging in with: admin@demo.com / admin123
          </div>
        </CardContent>
      </Card>
    </div>
  )
}