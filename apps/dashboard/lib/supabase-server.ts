import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceRoleClient: SupabaseClient | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim() || "";

  if (!value) {
    throw new Error(`${name} est requis pour le dashboard FEATNESS.`);
  }

  return value;
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    serviceRoleClient = createClient(
      getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
      getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  return serviceRoleClient;
}
