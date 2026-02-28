"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SharedSidebar } from "@/components/shared-sidebar"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, LogOut } from "lucide-react"
import Link from "next/link"

interface User {
  id: string
  email?: string
  name?: string
  role?: string
  user_metadata?: {
    name?: string
  }
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthenticatedLayoutProps {
  children: React.ReactNode
  title?: string
  showBackButton?: boolean
  backHref?: string
  headerActions?: React.ReactNode
}

export function AuthenticatedLayout({
  children,
  title,
  showBackButton = false,
  backHref,
  headerActions
}: AuthenticatedLayoutProps) {
  const { user, signOut } = useAuth()

  return (
    <div className="flex min-h-screen w-full">
      <SharedSidebar />

      <div className="flex-1 flex flex-col">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
          <div className="flex flex-1 items-center gap-2">
            {showBackButton && backHref && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Regresar
                </Link>
              </Button>
            )}
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            {headerActions}
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" />
              Salir
            </Button>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === 'undefined') {
        setLoading(false)
        return
      }

      // Check for admin dev session
      const devSessionStr = localStorage.getItem("devSession")
      if (devSessionStr) {
        try {
          const devSession = JSON.parse(devSessionStr)
          if (devSession && devSession.user) {
            // Check if session is expired
            if (devSession.expiresAt && new Date(devSession.expiresAt) < new Date()) {
              localStorage.removeItem("devSession")
            } else {
              setUser({
                id: devSession.user.id,
                email: devSession.user.email,
                name: devSession.user.name,
                role: devSession.user.role,
                user_metadata: {
                  name: devSession.user.name
                }
              })
              setLoading(false)
              return
            }
          }
        } catch (e) {
          console.error("Error parsing dev session:", e)
          localStorage.removeItem("devSession")
        }
      }

      // Check for employee session
      const employeeSessionStr = localStorage.getItem("employeeSession")
      if (employeeSessionStr) {
        try {
          const employeeSession = JSON.parse(employeeSessionStr)
          if (employeeSession && employeeSession.id) {
            setUser({
              id: employeeSession.id,
              email: employeeSession.email,
              name: employeeSession.name,
              role: employeeSession.access_level || 'employee',
              user_metadata: {
                name: employeeSession.name
              }
            })
            setLoading(false)
            return
          }
        } catch (e) {
          console.error("Error parsing employee session:", e)
          localStorage.removeItem("employeeSession")
        }
      }

      // No session found, redirect to login
      setLoading(false)
      router.push("/auth/login")
    }

    checkAuth()
  }, [router])

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("devSession")
      localStorage.removeItem("employeeSession")
    }
    setUser(null)

    // Clear the server-side cookie
    try {
      await fetch("/api/dev-auth", { method: "DELETE" }).catch(() => {})
    } catch {
      // Ignore errors clearing cookie
    }

    router.push("/auth/login")
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirigiendo al inicio de sesión...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
