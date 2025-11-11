"use client"

import { usePathname } from "next/navigation"
import { AuthProvider } from "./authenticated-layout"

export function ConditionalAuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // Check if we're on an auth page
  const isAuthPage = pathname.startsWith('/auth/')
  
  // If it's an auth page, render children directly without AuthProvider
  if (isAuthPage) {
    return <>{children}</>
  }
  
  // For all other pages, wrap with AuthProvider
  return <AuthProvider>{children}</AuthProvider>
}
