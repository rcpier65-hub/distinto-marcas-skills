// app/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

/**
 * Cliente Supabase con service_role key.
 * SOLO usar desde Server-side code (API routes, Server Actions internas).
 * NUNCA exponer al cliente — bypassa RLS.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or SERVICE_ROLE_KEY in env')
  }

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
