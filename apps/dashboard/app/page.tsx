import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getOwnerSessionOrNull } from "@/lib/auth";

export default async function HomePage() {
  const ownerContext = await getOwnerSessionOrNull(cookies());
  redirect(ownerContext ? "/overview" : "/login");
}
