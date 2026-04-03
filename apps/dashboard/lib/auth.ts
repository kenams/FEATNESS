import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { Session, User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

import type { DashboardProfile } from "@/lib/dashboard-shared";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

function getRequiredEnvValue(value: string | undefined, name: string): string {
  const normalized = value?.trim() || "";

  if (!normalized) {
    throw new Error(`${name} est requis pour le dashboard FEATNESS.`);
  }

  return normalized;
}

function createServerAuthClient(cookieStore: ReadonlyRequestCookies) {
  const supabaseUrl = getRequiredEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "NEXT_PUBLIC_SUPABASE_URL",
  );
  const supabaseAnonKey = getRequiredEnvValue(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

async function getProfileForUser(
  userId: string,
  fallbackEmail: string,
): Promise<DashboardProfile | null> {
  const serviceRole = getSupabaseServiceRoleClient();
  const { data: profileRow, error } = await serviceRole
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profileRow) {
    return null;
  }

  return {
    id: String(profileRow.id),
    email: String(profileRow.email ?? fallbackEmail),
    fullName: (profileRow.full_name as string | null) ?? null,
    role: profileRow.role as DashboardProfile["role"],
  };
}

export async function getAuthenticatedContextOrNull(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile } | null> {
  const session = await getServerSession(cookieStore);

  if (!session?.user) {
    return null;
  }

  const profile = await getProfileForUser(
    session.user.id,
    session.user.email ?? "",
  );

  if (!profile) {
    return null;
  }

  return {
    user: session.user,
    profile,
  };
}

export async function requireAuthenticated(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile }> {
  const context = await getAuthenticatedContextOrNull(cookieStore);

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireOwner(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile }> {
  const context = await requireAuthenticated(cookieStore);
  const role = context.profile.role;

  if (role !== "owner" && role !== "admin") {
    redirect("/login");
  }

  return context;
}

export async function getOwnerSessionOrNull(
  cookieStore: ReadonlyRequestCookies,
): Promise<{ user: User; profile: DashboardProfile } | null> {
  const context = await getAuthenticatedContextOrNull(cookieStore);

  if (!context) {
    return null;
  }

  const role = context.profile.role;

  if (role !== "owner" && role !== "admin") {
    return null;
  }

  return context;
}

export function getDefaultAppPath(role: DashboardProfile["role"]): string {
  if (role === "owner" || role === "admin") {
    return "/admin/overview";
  }

  return "/app";
}
