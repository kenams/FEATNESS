import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let mobileClient: SupabaseClient | null = null;

export function isMobileSupabaseConfigured(): boolean {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || "";

  return Boolean(url && key);
}

export function getMobileSupabaseClient(): SupabaseClient | null {
  if (!isMobileSupabaseConfigured()) {
    return null;
  }

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim();

  if (!mobileClient) {
    mobileClient = createClient(url, key, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  return mobileClient;
}
