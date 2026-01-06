"use client"

import type React from "react"

import { createClient } from "@/lib/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function Page() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Employee login states
  const [employeeEmail, setEmployeeEmail] = useState("")
  const [employeePassword, setEmployeePassword] = useState("")
  const [employeeError, setEmployeeError] = useState<string | null>(null)
  const [isEmployeeLoading, setIsEmployeeLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Check if Supabase is configured
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const isSupabaseConfigured = supabaseUrl && 
        supabaseUrl !== 'https://your-project.supabase.co' &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-anon-key-here'

      if (!isSupabaseConfigured) {
        // Use development authentication
        const response = await fetch("/api/dev-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (!response.ok) {
          const text = await response.text()
          console.error('Auth response:', text)
          throw new Error("Error de inicio de sesión. Intenta: admin@demo.com / admin123")
        }

        const result = await response.json()
        
        if (result.success) {
          localStorage.setItem("devSession", JSON.stringify(result.session))
          router.push("/")
        } else {
          throw new Error(result.error || "Error de inicio de sesión. Intenta: admin@demo.com / admin123")
        }
      } else {
        // Use Supabase authentication
        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push("/")
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsEmployeeLoading(true)
    setEmployeeError(null)

    try {
      const response = await fetch("/api/auth/employee", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: employeeEmail,
          password: employeePassword,
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        // Store employee session data
        localStorage.setItem("employeeSession", JSON.stringify(result.data))
        router.push("/")
      } else {
        setEmployeeError(result.error || "Credenciales inválidas")
      }
    } catch {
      setEmployeeError("Ocurrió un error durante el inicio de sesión")
    } finally {
      setIsEmployeeLoading(false)
    }
  }

  const isDevMode = !process.env.NEXT_PUBLIC_SUPABASE_URL || 
    process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://your-project.supabase.co'

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">AI Gym 24/7</h1>
          <p className="text-muted-foreground mt-2">Gestión Inteligente de Gimnasio</p>
          {isDevMode && (
            <div className="mt-4 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-md text-sm">
              <strong>Modo de Desarrollo</strong><br />
              Usa: admin@demo.com / admin123
            </div>
          )}
        </div>
        
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center">
              Elige tu método de inicio de sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="admin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="admin">Administrador</TabsTrigger>
                <TabsTrigger value="employee">Empleado</TabsTrigger>
              </TabsList>
              
              <TabsContent value="admin" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  {error && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                  ¿No tienes una cuenta?{" "}
                  <Link href="/auth/sign-up" className="text-primary hover:underline">
                    Registrarse
                  </Link>
                </div>
              </TabsContent>
              
              <TabsContent value="employee" className="space-y-4">
                <form onSubmit={handleEmployeeLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee-email">Correo Electrónico</Label>
                    <Input
                      id="employee-email"
                      type="email"
                      placeholder="tucorreo@empresa.com"
                      required
                      value={employeeEmail}
                      onChange={(e) => setEmployeeEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employee-password">Contraseña</Label>
                    <Input
                      id="employee-password"
                      type="password"
                      required
                      value={employeePassword}
                      onChange={(e) => setEmployeePassword(e.target.value)}
                    />
                  </div>
                  {employeeError && (
                    <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950 p-3 rounded-md">
                      {employeeError}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isEmployeeLoading}>
                    {isEmployeeLoading ? "Iniciando sesión..." : "Acceso Empleado"}
                  </Button>
                </form>
                <div className="mt-6 text-center text-sm text-muted-foreground">
                  Usa tu correo corporativo y la contraseña asignada
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
