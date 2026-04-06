"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import {
  ACTIVITY_PRESETS,
  addMinutesToIso,
  buildNutritionRecommendation,
  generateUuid,
  isUuid,
  type DispenseTokenRecord,
  type GoalKey,
  type IntensityLevel,
  type KioskScanPayload,
  type PreparationStatus,
  type SportKey,
  type UserWorkoutInput,
  type WorkoutSessionRecord,
} from "@featness/shared";

import { getSupabaseBrowserClient } from "@/lib/supabase";

const PREPARATION_SEQUENCE: PreparationStatus[] = [
  "queued",
  "mixing",
  "ready",
  "completed",
];

function getStatusLabel(status: PreparationStatus) {
  switch (status) {
    case "pending":
      return "En attente";
    case "scanned":
      return "QR valide";
    case "queued":
      return "Mise en file";
    case "mixing":
      return "Preparation en cours";
    case "ready":
      return "Boisson prete";
    case "completed":
      return "Distribution terminee";
    default:
      return status;
  }
}

function createDemoPayload(workout: UserWorkoutInput): KioskScanPayload {
  const recommendation = buildNutritionRecommendation(workout);
  const sessionId = generateUuid();
  const userId = generateUuid();
  const now = new Date().toISOString();
  const token: DispenseTokenRecord = {
    id: generateUuid(),
    userId,
    sessionId,
    status: "active",
    createdAt: now,
    expiresAt: addMinutesToIso(now, 30),
    consumedAt: null,
  };
  const session: WorkoutSessionRecord = {
    id: sessionId,
    userId,
    createdAt: now,
    updatedAt: now,
    workout,
    recommendation,
    preparationStatus: "scanned",
    selectedMealBlendId: null,
    isFavorite: false,
    userNote: null,
  };

  return {
    token,
    session,
    profile: {
      id: userId,
      email: "demo@featness.app",
      fullName: "Membre Demo",
      gymName: "Salle FEATNESS Demo",
    },
  };
}

export function KioskSimulator() {
  const supabaseAvailable = Boolean(getSupabaseBrowserClient());
  const [tokenInput, setTokenInput] = useState("");
  const [sport, setSport] = useState<SportKey>("cycling");
  const [intensity, setIntensity] = useState<IntensityLevel>("moderate");
  const [durationMin, setDurationMin] = useState(45);
  const [weightKg, setWeightKg] = useState(78);
  const [goal, setGoal] = useState<GoalKey>("recovery");
  const [payload, setPayload] = useState<KioskScanPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const workout = useMemo<UserWorkoutInput>(
    () => ({
      sport,
      intensity,
      durationMin,
      weightKg,
      goal,
    }),
    [durationMin, goal, intensity, sport, weightKg],
  );

  const recommendation = useMemo(
    () => buildNutritionRecommendation(workout),
    [workout],
  );

  useEffect(() => {
    if (!payload || payload.session.preparationStatus === "completed") {
      return;
    }

    const currentIndex = PREPARATION_SEQUENCE.indexOf(
      payload.session.preparationStatus,
    );
    const nextStatus =
      payload.session.preparationStatus === "scanned"
        ? PREPARATION_SEQUENCE[0]
        : PREPARATION_SEQUENCE[currentIndex + 1];

    if (!nextStatus) {
      return;
    }

    const timer = window.setTimeout(() => {
      void advancePreparation(nextStatus);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [payload]);

  async function scanToken() {
    const normalizedToken = tokenInput.trim();

    if (!isUuid(normalizedToken)) {
      setMessage("Le QR FEATNESS doit contenir un UUID valide.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: normalizedToken }),
      });

      const responseBody = (await response.json()) as
        | KioskScanPayload
        | { error: string };

      if (!response.ok || "error" in responseBody) {
        setPayload(null);
        setMessage(
          "error" in responseBody
            ? responseBody.error
            : "Le scan FEATNESS a echoue.",
        );
        return;
      }

      setIsDemoMode(false);
      setPayload(responseBody);
      setMessage("QR FEATNESS valide. Preparation engagee.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Le scan FEATNESS a echoue.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function startDemoMode() {
    setIsBusy(true);
    setMessage(null);

    const nextPayload = createDemoPayload(workout);
    setTokenInput(nextPayload.token.id);
    setPayload(nextPayload);
    setIsDemoMode(true);
    setIsBusy(false);
    setMessage("Mode demo active. Aucun mobile n'est requis pour la borne.");
  }

  async function advancePreparation(nextStatus: PreparationStatus) {
    if (!payload) {
      return;
    }

    if (isDemoMode) {
      setPayload({
        ...payload,
        token: {
          ...payload.token,
          status: nextStatus === "completed" ? "consumed" : payload.token.status,
          consumedAt:
            nextStatus === "completed" ? new Date().toISOString() : payload.token.consumedAt,
        },
        session: {
          ...payload.session,
          preparationStatus: nextStatus,
          updatedAt: new Date().toISOString(),
        },
      });
      return;
    }

    try {
      const response = await fetch("/api/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: payload.token.id,
          status: nextStatus,
        }),
      });

      const body = (await response.json()) as
        | { preparationStatus: PreparationStatus }
        | { error: string };

      if (!response.ok || "error" in body) {
        setMessage("error" in body ? body.error : "Preparation impossible.");
        return;
      }

      setPayload({
        ...payload,
        token: {
          ...payload.token,
          status: nextStatus === "completed" ? "consumed" : payload.token.status,
          consumedAt:
            nextStatus === "completed" ? new Date().toISOString() : payload.token.consumedAt,
        },
        session: {
          ...payload.session,
          preparationStatus: body.preparationStatus,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Preparation impossible.",
      );
    }
  }

  return (
    <main style={layoutStyle}>
      <section style={heroStyle}>
        <p style={eyebrowStyle}>FEATNESS Kiosk</p>
        <h1 style={{ marginTop: 12, fontSize: 42, lineHeight: 1.05 }}>
          Distribution nutrition pilotee par QR
        </h1>
        <p style={{ color: "#9eb6af", maxWidth: 760 }}>
          La borne valide un QR FEATNESS, controle son UUID, son statut et sa
          fenetre de validite de 30 minutes, puis enchaine la preparation.
        </p>

        <div style={scanGridStyle}>
          <label>
            <span style={labelStyle}>Token QR / UUID</span>
            <input
              value={tokenInput}
              onChange={(event) => setTokenInput(event.target.value)}
              placeholder="Collez le token genere sur mobile"
              style={fieldStyle}
            />
          </label>
          <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
            <button
              onClick={() => void scanToken()}
              style={primaryButtonStyle}
              disabled={isBusy}
            >
              {isBusy ? "Scan..." : "Scanner le QR"}
            </button>
            <button
              onClick={() => void startDemoMode()}
              style={secondaryButtonStyle}
              disabled={isBusy}
            >
              Mode demo
            </button>
          </div>
        </div>

        <p style={{ marginTop: 14, color: "#9eb6af" }}>
          {supabaseAvailable
            ? "Supabase public est configure dans la borne. Les validations QR passent par les routes serveur securisees."
            : "Supabase public n'est pas configure dans le navigateur. Utilise le mode demo pour la borne."}
        </p>

        {message ? <div style={messageStyle}>{message}</div> : null}

        <div style={demoPanelStyle}>
          <h2 style={sectionTitleStyle}>Scenario demo borne</h2>
          <p style={{ color: "#9eb6af", marginTop: 0 }}>
            Ce formulaire sert a generer un faux QR credible sans mobile pour une
            demo B2B.
          </p>

          <div style={formGridStyle}>
            <label>
              <span style={labelStyle}>Sport</span>
              <select
                value={sport}
                onChange={(event) => setSport(event.target.value as SportKey)}
                style={fieldStyle}
              >
                {ACTIVITY_PRESETS.map((preset) => (
                  <option key={preset.key} value={preset.key}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span style={labelStyle}>Intensite</span>
              <select
                value={intensity}
                onChange={(event) => setIntensity(event.target.value as IntensityLevel)}
                style={fieldStyle}
              >
                <option value="light">Legere</option>
                <option value="moderate">Moderee</option>
                <option value="intense">Intense</option>
              </select>
            </label>
            <label>
              <span style={labelStyle}>Objectif</span>
              <select
                value={goal}
                onChange={(event) => setGoal(event.target.value as GoalKey)}
                style={fieldStyle}
              >
                <option value="hydration">Hydratation</option>
                <option value="recovery">Recuperation</option>
                <option value="performance">Performance</option>
              </select>
            </label>
            <label>
              <span style={labelStyle}>Duree (min)</span>
              <input
                type="number"
                value={durationMin}
                onChange={(event) => setDurationMin(Number(event.target.value))}
                style={fieldStyle}
              />
            </label>
            <label>
              <span style={labelStyle}>Poids (kg)</span>
              <input
                type="number"
                value={weightKg}
                onChange={(event) => setWeightKg(Number(event.target.value))}
                style={fieldStyle}
              />
            </label>
          </div>
        </div>
      </section>

      <section style={sideGridStyle}>
        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Recommendation instantanee</h2>
          <MetricRow label="Calories estimees" value={`${recommendation.caloriesBurned} kcal`} />
          <MetricRow label="Hydratation" value={`${recommendation.hydrationMl} ml`} />
          <MetricRow label="Glucides" value={`${recommendation.carbsG} g`} />
          <MetricRow label="Proteines" value={`${recommendation.proteinG} g`} />
          <MetricRow label="Electrolytes" value={`${recommendation.electrolytesMg} mg`} />
          <div style={calloutStyle}>{recommendation.recommendationSummary}</div>
        </div>

        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Validation QR</h2>
          <MetricRow
            label="Format UUID"
            value={tokenInput ? (isUuid(tokenInput) ? "valide" : "invalide") : "vide"}
          />
          <MetricRow
            label="Source"
            value={isDemoMode ? "mode demo" : payload ? "mobile FEATNESS" : "aucune"}
          />
          <MetricRow
            label="Validite"
            value={payload ? new Date(payload.token.expiresAt).toLocaleTimeString("fr-FR") : "--"}
          />
        </div>

        <div style={panelStyle}>
          <h2 style={sectionTitleStyle}>Cycle borne</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {(["scanned", ...PREPARATION_SEQUENCE] as PreparationStatus[]).map((status) => {
              const currentStatus = payload?.session.preparationStatus;
              const activeIndex = currentStatus
                ? ["scanned", ...PREPARATION_SEQUENCE].indexOf(currentStatus)
                : -1;
              const statusIndex = ["scanned", ...PREPARATION_SEQUENCE].indexOf(status);
              const isActive = statusIndex <= activeIndex;

              return (
                <div key={status} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: isActive ? "rgba(89,211,154,0.16)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <span>{getStatusLabel(status)}</span>
                  <span style={{ color: isActive ? "#59d39a" : "#9eb6af" }}>
                    {isActive ? "OK" : "attente"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {payload ? (
          <div style={panelStyle}>
            <h2 style={sectionTitleStyle}>Session scannee</h2>
            <MetricRow label="Token" value={payload.token.id} />
            <MetricRow
              label="Membre"
              value={payload.profile?.fullName || payload.profile?.email || "Membre FEATNESS"}
            />
            <MetricRow label="Salle" value={payload.profile?.gymName || "FEATNESS Demo"} />
            <MetricRow label="Statut" value={getStatusLabel(payload.session.preparationStatus)} />
            <MetricRow label="Melange" value={payload.session.recommendation.recommendedBlend} />
          </div>
        ) : null}
      </section>
    </main>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
    }}>
      <span style={{ color: "#9eb6af" }}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const layoutStyle: CSSProperties = {
  minHeight: "100vh",
  padding: 24,
  display: "grid",
  gap: 24,
  gridTemplateColumns: "1.1fr 0.9fr",
};

const heroStyle: CSSProperties = {
  background: "rgba(16, 32, 29, 0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 28,
  padding: 24,
};

const scanGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "1.3fr auto",
  marginTop: 24,
  alignItems: "end",
};

const formGridStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "1fr 1fr",
};

const sideGridStyle: CSSProperties = {
  display: "grid",
  gap: 20,
  alignContent: "start",
};

const demoPanelStyle: CSSProperties = {
  marginTop: 24,
  background: "rgba(255,255,255,0.03)",
  borderRadius: 24,
  padding: 20,
  border: "1px solid rgba(255,255,255,0.06)",
};

const fieldStyle: CSSProperties = {
  width: "100%",
  background: "#0f1f1a",
  color: "#f6f7f8",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  padding: "12px 14px",
};

const primaryButtonStyle: CSSProperties = {
  background: "#c9a646",
  color: "#08110f",
  border: "none",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 700,
};

const secondaryButtonStyle: CSSProperties = {
  background: "transparent",
  color: "#f6f7f8",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 600,
};

const panelStyle: CSSProperties = {
  background: "rgba(16, 32, 29, 0.92)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 24,
  padding: 20,
};

const calloutStyle: CSSProperties = {
  marginTop: 16,
  background: "rgba(201, 166, 70, 0.12)",
  border: "1px solid rgba(201, 166, 70, 0.3)",
  borderRadius: 18,
  padding: 14,
  color: "#f7e3a5",
};

const eyebrowStyle: CSSProperties = {
  color: "#c9a646",
  letterSpacing: "0.24em",
  textTransform: "uppercase",
  fontSize: 12,
};

const messageStyle: CSSProperties = {
  marginTop: 18,
  background: "rgba(201,166,70,0.1)",
  border: "1px solid rgba(201,166,70,0.25)",
  borderRadius: 18,
  padding: 14,
  color: "#f7e3a5",
};

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 8,
  color: "#9eb6af",
};

const sectionTitleStyle: CSSProperties = {
  fontSize: 22,
  marginTop: 0,
  marginBottom: 16,
};
