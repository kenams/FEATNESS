import { cookies } from "next/headers";

import { UserAppShell } from "@/components/user-app-shell";
import { requireAuthenticated } from "@/lib/auth";

export default async function UserAppPage() {
  const { profile } = await requireAuthenticated(cookies());

  return <UserAppShell initialProfile={profile} />;
}
