import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { DashboardProfile } from "@/lib/dashboard-shared";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

function getRequiredPublicEnv(name: string): string {
  const value = process.env[name]?.trim() || "";

  if (!value) {
    throw new Error(`${name} est requis pour le dashboard FEATNESS.`);
  }

  return value;
}

function createServerAuthClient(cookieStore: ReadonlyRequestCookies) {
  return createServerClient(
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Cookies are read-only in Server Components.
        },
      },
    },
  );
}

export async function getServerSession(
  cookieStore: ReadonlyRequestCookies,
): Promise<Session | null> {
  const supabase = createServerAuthClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export async function requireOwner(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile }> {
  const session = await getServerSession(cookieStore);

  if (!session?.user) {
    redirect("/login");
  }

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: profileRow, error } = await serviceRole
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !profileRow) {
    redirect("/login");
  }

  const role = profileRow.role as DashboardProfile["role"];

  if (role !== "owner" && role !== "admin") {
    redirect("/login");
  }

  return {
    user: session.user,
    profile: {
      id: String(profileRow.id),
      email: String(profileRow.email ?? session.user.email ?? ""),
      fullName: (profileRow.full_name as string | null) ?? null,
      role,
    },
  };
}

export async function getOwnerSessionOrNull(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile } | null> {
  const session = await getServerSession(cookieStore);

  if (!session?.user) {
    return null;
  }

  const serviceRole = getSupabaseServiceRoleClient();
  const { data: profileRow, error } = await serviceRole
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error || !profileRow) {
    return null;
  }

  const role = profileRow.role as DashboardProfile["role"];

  if (role !== "owner" && role !== "admin") {
    return null;
  }

  return {
    user: session.user,
    profile: {
      id: String(profileRow.id),
      email: String(profileRow.email ?? session.user.email ?? ""),
      fullName: (profileRow.full_name as string | null) ?? null,
      role,
    },
  };
}
