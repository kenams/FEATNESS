import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAuthenticatedContextOrNull, getDefaultAppPath } from "@/lib/auth";

export default async function HomePage() {
  const context = await getAuthenticatedContextOrNull(cookies());
  redirect(context ? getDefaultAppPath(context.profile.role) : "/login");
}
