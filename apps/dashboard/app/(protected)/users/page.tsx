import { cookies } from "next/headers";

import { MetricCard } from "@/components/metric-card";
import { UsersTable } from "@/components/users-table";
import { requireOwner } from "@/lib/auth";
import { formatCurrency } from "@/lib/dashboard-shared";
import { getDashboardUsers } from "@/lib/data";

export default async function UsersPage() {
  const { profile } = await requireOwner(cookies());
  const users = await getDashboardUsers();
  const onboardingCompletedCount = users.filter((user) => user.onboardingCompleted).length;
  const pushEnabledCount = users.filter((user) => Boolean(user.expoPushToken)).length;
  const favoriteUsersCount = users.filter((user) => user.favoriteMealIds.length > 0).length;
  const totalRevenue = users.reduce((sum, user) => sum + user.totalSpentEur, 0);

  return (
    <div className="grid gap-6">
      <header className="overflow-hidden rounded-[36px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(217,189,100,0.18),transparent_34%),linear-gradient(135deg,#101715_0%,#16211d_52%,#f4f7f5_52%,#ffffff_100%)] p-6 shadow-[0_24px_80px_rgba(16,24,22,0.12)] lg:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr] lg:items-end">
          <div className="grid gap-2">
            <p className="text-sm uppercase tracking-[0.24em] text-featness-gold">
              FEATNESS Admin
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white lg:text-4xl">
              Utilisateurs
            </h1>
            <p className="max-w-xl text-sm text-white/72">
              Vision complete des profils mobiles, de l&apos;engagement et des preferences.
            </p>
          </div>

          <div className="grid gap-3 rounded-[28px] border border-black/5 bg-white/92 p-5 backdrop-blur">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-semibold text-featness-ink">
                {users.length} profils
              </span>
              <span className="rounded-full bg-[#eef3ef] px-3 py-1 text-xs font-semibold text-featness-ink">
                {pushEnabledCount} push actifs
              </span>
            </div>
            <p className="text-sm text-featness-muted">
              Les profils FEATNESS combines ici les comportements mobile, les favoris
              et la valeur commerciale generee.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Profils total" value={String(users.length)} />
        <MetricCard
          label="Onboarding termine"
          value={String(onboardingCompletedCount)}
        />
        <MetricCard
          label="Push actifs"
          value={String(pushEnabledCount)}
          hint="Profils avec token Expo"
        />
        <MetricCard
          label="CA utilisateurs"
          value={formatCurrency(totalRevenue)}
          hint={`${favoriteUsersCount} profils avec favoris`}
        />
      </section>

      <UsersTable users={users} currentRole={profile.role} />
    </div>
  );
}
