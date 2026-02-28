import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConditionalAuthProvider } from "@/components/conditional-auth-provider"
import { CartProvider } from "@/components/cart-provider"
import { CartSidebar } from "@/components/cart-sidebar"

export const metadata: Metadata = {
  title: "AI Gym 24/7",
  description: "Smart Fitness Management System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SidebarProvider>
            <ConditionalAuthProvider>
              <CartProvider>
                {children}
                <CartSidebar />
              </CartProvider>
            </ConditionalAuthProvider>
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
