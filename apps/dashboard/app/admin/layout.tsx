import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { NavSidebar } from "@/components/nav-sidebar";
import { requireOwner } from "@/lib/auth";
import { getFirstName } from "@/lib/dashboard-shared";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireOwner(cookies());

  return (
    <div className="min-h-screen text-featness-ink lg:flex">
      <NavSidebar firstName={getFirstName(profile)} email={profile.email} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
