"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function getRequiredPublicEnvValue(value: string | undefined, name: string): string {
  const normalized = value?.trim() || "";

  if (!normalized) {
    throw new Error(`${name} est requis pour le dashboard FEATNESS.`);
  }

  return normalized;
}

export function getSupabaseBrowserClient(): SupabaseClient {
  if (!browserClient) {
    const supabaseUrl = getRequiredPublicEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    );
    const supabaseAnonKey = getRequiredPublicEnvValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );

    browserClient = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
    );
  }

  return browserClient;
}
