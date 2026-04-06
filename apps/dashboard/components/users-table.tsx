"use client";

import { useMemo, useState } from "react";

import {
  formatCurrency,
  type DashboardProfile,
  type DashboardUserRecord,
} from "@/lib/dashboard-shared";

type UsersTableProps = {
  users: DashboardUserRecord[];
  currentRole: DashboardProfile["role"];
};

const roleOptions: DashboardProfile["role"][] = ["user", "owner", "admin"];

export function UsersTable({ users, currentRole }: UsersTableProps) {
  const [items, setItems] = useState(users);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedGoal, setSelectedGoal] = useState("all");
  const [selectedOnboarding, setSelectedOnboarding] = useState("all");
  const [selectedPush, setSelectedPush] = useState("all");
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canManageRoles = currentRole === "admin";

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((user) => {
      const searchMatch =
        normalizedSearch.length === 0 ||
        user.email.toLowerCase().includes(normalizedSearch) ||
        (user.fullName ?? "").toLowerCase().includes(normalizedSearch) ||
        user.id.toLowerCase().includes(normalizedSearch) ||
        (user.gymName ?? "").toLowerCase().includes(normalizedSearch);
      const roleMatch = selectedRole === "all" || user.role === selectedRole;
      const goalMatch =
        selectedGoal === "all" || user.preferredGoal === selectedGoal;
      const onboardingMatch =
        selectedOnboarding === "all" ||
        (selectedOnboarding === "completed"
          ? user.onboardingCompleted
          : !user.onboardingCompleted);
      const pushMatch =
        selectedPush === "all" ||
        (selectedPush === "enabled" ? Boolean(user.expoPushToken) : !user.expoPushToken);

      return searchMatch && roleMatch && goalMatch && onboardingMatch && pushMatch;
    });
  }, [
    items,
    searchTerm,
    selectedRole,
    selectedGoal,
    selectedOnboarding,
    selectedPush,
  ]);

  const favoriteCount = filteredItems.reduce(
    (sum, user) => sum + user.favoriteMealIds.length,
    0,
  );
  const workoutCount = filteredItems.reduce((sum, user) => sum + user.totalWorkouts, 0);

  async function handleExportCsv() {
    const header = [
      "user_id",
      "email",
      "full_name",
      "role",
      "onboarding_completed",
      "gym_name",
      "preferred_sport",
      "preferred_goal",
      "favorites_count",
      "push_enabled",
      "latest_workout_at",
      "latest_workout_goal",
      "total_workouts",
      "total_payments",
      "total_spent_eur",
      "created_at",
    ];
    const rows = filteredItems.map((user) => [
      user.id,
      user.email,
      user.fullName ?? "",
      user.role,
      user.onboardingCompleted ? "yes" : "no",
      user.gymName ?? "",
      user.preferredSport ?? "",
      user.preferredGoal ?? "",
      String(user.favoriteMealIds.length),
      user.expoPushToken ? "yes" : "no",
      user.latestWorkoutAt ?? "",
      user.latestWorkoutGoal ?? "",
      String(user.totalWorkouts),
      String(user.totalPayments),
      user.totalSpentEur.toFixed(2),
      user.createdAt,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "featness-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleRoleChange(userId: string, nextRole: DashboardProfile["role"]) {
    if (!canManageRoles) {
      return;
    }

    setSavingUserId(userId);
    setErrorMessage(null);

    const previousItems = items;
    setItems((current) =>
      current.map((user) => (user.id === userId ? { ...user, role: nextRole } : user)),
    );

    const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const body = (await response.json()) as { error?: string };

    if (!response.ok) {
      setItems(previousItems);
      setErrorMessage(body.error ?? "La mise a jour du role a echoue.");
    }

    setSavingUserId(null);
  }

  return (
    <div className="rounded-[30px] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,247,0.94))] p-6 shadow-[0_18px_55px_rgba(17,32,28,0.08)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-featness-gold">
            Audience
          </p>
          <h2 className="mt-2 text-xl font-semibold text-featness-ink">Utilisateurs</h2>
          <p className="text-sm text-featness-muted">
            Suivi des profils, preferences, activite et roles FEATNESS.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleExportCsv()}
          className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-featness-ink transition hover:border-featness-gold"
        >
          Exporter CSV
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Utilisateurs filtres
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {filteredItems.length}
          </p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Workouts cumules
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">{workoutCount}</p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            Favoris cumules
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">{favoriteCount}</p>
        </div>
        <div className="rounded-[22px] bg-[#f8faf9] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-featness-muted">
            CA cumule
          </p>
          <p className="mt-2 text-2xl font-semibold text-featness-ink">
            {formatCurrency(
              filteredItems.reduce((sum, user) => sum + user.totalSpentEur, 0),
            )}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher email, nom, id, salle..."
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        />
        <select
          value={selectedRole}
          onChange={(event) => setSelectedRole(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les roles</option>
          {roleOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <select
          value={selectedGoal}
          onChange={(event) => setSelectedGoal(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Tous les objectifs</option>
          <option value="hydration">hydration</option>
          <option value="recovery">recovery</option>
          <option value="performance">performance</option>
        </select>
        <select
          value={selectedOnboarding}
          onChange={(event) => setSelectedOnboarding(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Onboarding tous</option>
          <option value="completed">Onboarding termine</option>
          <option value="pending">Onboarding incomplet</option>
        </select>
        <select
          value={selectedPush}
          onChange={(event) => setSelectedPush(event.target.value)}
          className="rounded-[18px] border border-black/10 bg-white/90 px-4 py-3 text-sm shadow-sm"
        >
          <option value="all">Push tous</option>
          <option value="enabled">Push actifs</option>
          <option value="disabled">Push absents</option>
        </select>
      </div>

      {errorMessage ? <p className="mt-4 text-sm text-red-600">{errorMessage}</p> : null}

      <div className="mt-5 overflow-x-auto rounded-[24px] border border-black/5 bg-white/70">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7faf8] text-featness-muted">
            <tr className="border-b border-black/5">
              <th className="px-4 py-4 font-medium">Utilisateur</th>
              <th className="px-4 py-4 font-medium">Role</th>
              <th className="px-4 py-4 font-medium">Objectif</th>
              <th className="px-4 py-4 font-medium">Favoris</th>
              <th className="px-4 py-4 font-medium">Workouts</th>
              <th className="px-4 py-4 font-medium">CA</th>
              <th className="px-4 py-4 font-medium">Push</th>
              <th className="px-4 py-4 font-medium">Activite recente</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((user) => (
              <tr key={user.id} className="border-b border-black/5 last:border-0 hover:bg-[#f8faf9]">
                <td className="px-4 py-4">
                  <div className="grid gap-1">
                    <p className="font-medium text-featness-ink">
                      {user.fullName || user.email}
                    </p>
                    <p className="text-featness-muted">{user.email}</p>
                    <p className="font-mono text-xs text-featness-muted">{user.id}</p>
                  </div>
                </td>
                <td className="px-4 py-4">
                  {canManageRoles ? (
                    <select
                      value={user.role}
                      disabled={savingUserId === user.id}
                      onChange={(event) =>
                        void handleRoleChange(
                          user.id,
                          event.target.value as DashboardProfile["role"],
                        )
                      }
                      className="rounded-[14px] border border-black/10 bg-white px-3 py-2 text-sm shadow-sm"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-[#f8faf9] px-3 py-1 text-xs font-semibold uppercase text-featness-ink">
                      {user.role}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1 text-featness-ink">
                    <span>{user.preferredGoal ?? "-"}</span>
                    <span className="text-xs text-featness-muted">
                      Sport : {user.preferredSport ?? "-"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1 text-featness-ink">
                    <span>{user.favoriteMealIds.length}</span>
                    <span className="text-xs text-featness-muted">
                      {user.gymName ?? "Salle non renseignee"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="grid gap-1 text-featness-ink">
                    <span>{user.totalWorkouts}</span>
                    <span className="text-xs text-featness-muted">
                      {user.latestWorkoutGoal ?? "Aucune seance"}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 font-medium text-featness-ink">{formatCurrency(user.totalSpentEur)}</td>
                <td className="px-4 py-4">
                  {user.expoPushToken ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Actif
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-featness-muted">
                      Absent
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-featness-ink">
                  {user.latestWorkoutAt
                    ? new Date(user.latestWorkoutAt).toLocaleString("fr-FR")
                    : "Aucune seance"}
                </td>
              </tr>
            ))}
            {filteredItems.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-featness-muted" colSpan={8}>
                  Aucun utilisateur ne correspond aux filtres actifs.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
