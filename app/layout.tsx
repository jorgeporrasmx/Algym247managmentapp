import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ConditionalAuthProvider } from "@/components/conditional-auth-provider"
import { CartProvider } from "@/components/cart-provider"
import { CartSidebar } from "@/components/cart-sidebar"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AI Gym 24/7",
  description: "Smart Fitness Management System",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={geistSans.variable + " " + geistMono.variable + " font-sans"}>
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
