import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
export const createServerSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(supabaseUrl, supabaseKey)
}

// Client-side singleton
let clientSupabaseClient: ReturnType<typeof createClient> | null = null

export const createClientSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables")
  }

  if (!clientSupabaseClient) {
    clientSupabaseClient = createClient(supabaseUrl, supabaseKey)
  }

  return clientSupabaseClient
}
