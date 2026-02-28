"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Sign up is currently disabled - redirect to login
// TODO: Implement Firebase Auth sign up when ready
export default function Page() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/auth/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Registro no disponible. Redirigiendo...</p>
      </div>
    </div>
  )
}
