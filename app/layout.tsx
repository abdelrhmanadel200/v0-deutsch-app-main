import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth-provider"
import { OfflineIndicator } from "@/components/offline-indicator"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Deutsch Learning Platform",
  description: "Learn German with interactive tests and study materials",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
            <OfflineIndicator />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
