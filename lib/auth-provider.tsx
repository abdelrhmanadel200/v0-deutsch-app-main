"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { Loader2 } from "lucide-react"

type UserRole = "admin" | "teacher" | "student"

type Profile = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: UserRole
}

type AuthContextType = {
  user: User | null
  profile: Profile | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, firstName: string, lastName: string, role: UserRole) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setUser(session?.user || null)

      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

        setProfile(data as Profile)
      }

      setIsLoading(false)
    }

    getSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)

      if (session?.user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            setProfile(data as Profile)
          })
      } else {
        setProfile(null)
      }

      router.refresh()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const signIn = async (email: string, password: string) => {
    await supabase.auth.signInWithPassword({
      email,
      password,
    })
  }

  const signUp = async (email: string, password: string, firstName: string, lastName: string, role: UserRole) => {
    const {
      data: { user },
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    })

    if (user) {
      await supabase.from("profiles").insert({
        id: user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
      })
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, profile, signIn, signUp, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
