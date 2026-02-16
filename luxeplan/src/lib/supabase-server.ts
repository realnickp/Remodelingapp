import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the service-role key.
 * This bypasses RLS and is used by the ingestion system, worker, and scheduler.
 *
 * NEVER expose this client or its key to the browser.
 */

let _client: ReturnType<typeof createClient> | null = null;

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { url, key };
}

export function getServiceClient() {
  const { url, key } = getEnvVars();
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. " +
        "The ingestion system requires a service-role key."
    );
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/**
 * Returns true when the service-role env vars are present.
 * Used by API routes to decide whether to read from the DB or fall back to seed data.
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = getEnvVars();
  return Boolean(url && key);
}
