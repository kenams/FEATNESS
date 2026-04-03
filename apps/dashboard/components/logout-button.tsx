"use client";

import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={() => void handleLogout()}
      className="rounded-full border border-white/12 px-4 py-2 text-sm font-medium text-white transition hover:border-featness-gold hover:text-featness-gold"
      type="button"
    >
      Deconnexion
    </button>
  );
}
