import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceRoleClient: SupabaseClient | null = null;

function getRequiredEnvValue(value: string | undefined, name: string): string {
  const normalized = value?.trim() || "";

  if (!normalized) {
    throw new Error(`${name} est requis pour le dashboard FEATNESS.`);
  }

  return normalized;
}

export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (!serviceRoleClient) {
    const supabaseUrl = getRequiredEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    const serviceRoleKey = getRequiredEnvValue(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    serviceRoleClient = createClient(
      supabaseUrl,
      serviceRoleKey,
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
