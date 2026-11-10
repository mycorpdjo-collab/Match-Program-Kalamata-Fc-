import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './env';

let admin: SupabaseClient | null = null;

/** Service-role client. Server only — bypasses RLS. */
export function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) return null;
  if (!admin) admin = createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
  return admin;
}
