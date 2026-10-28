import type { SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when the build has Supabase credentials. Without them the app stays on-device with no sign-in. */
export const cloudConfigured = Boolean(url && key)

let client: Promise<SupabaseClient> | null = null

/** Created on first use so on-device builds never download the Supabase SDK. */
export function cloudClient(): Promise<SupabaseClient> {
  client ??= import('@supabase/supabase-js').then((m) =>
    m.createClient(url as string, key as string, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }),
  )
  return client
}
