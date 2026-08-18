import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. Server-side only (NextAuth callbacks,
// server actions). Never import this from a client component or route that
// runs in the browser.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
