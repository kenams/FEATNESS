"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { type MealPreparationType } from "@/lib/meal-catalog";
import { type PreparationStatus } from "@featness/shared";

import { formatEuro, getPreparationTypeLabel } from "@/lib/kiosk-display";

type DispensingScreenProps = {
  tokenId: string;
  userId: string | null;
  initialStatus: PreparationStatus;
  mealName: string;
  mealType: MealPreparationType;
  mealPrice: number;
};

const DISPENSE_SEQUENCE: PreparationStatus[] = [
  "queued",
  "mixing",
  "ready",
  "completed",
];

function getNextStatus(status: PreparationStatus): PreparationStatus | null {
  if (status === "pending" || status === "scanned") {
    return "queued";
  }

  const currentIndex = DISPENSE_SEQUENCE.indexOf(status);
  return DISPENSE_SEQUENCE[currentIndex + 1] ?? null;
}

function getStepIndex(status: PreparationStatus): number {
  switch (status) {
    case "pending":
    case "scanned":
      return 0;
    case "queued":
    case "mixing":
      return 1;
    case "ready":
      return 2;
    case "completed":
      return 3;
    default:
      return 0;
  }
}

function getProgressFill(status: PreparationStatus): number {
  switch (status) {
    case "queued":
      return 30;
    case "mixing":
      return 65;
    case "ready":
      return 92;
    case "completed":
      return 100;
    default:
      return 8;
  }
}

export function DispensingScreen({
  tokenId,
  userId,
  initialStatus,
  mealName,
  mealType,
  mealPrice,
}: DispensingScreenProps) {
  const router = useRouter();
  const [status, setStatus] = useState<PreparationStatus>(initialStatus);
  const [countdown, setCountdown] = useState(10);
  const [message, setMessage] = useState(
    "Confirmation du paiement puis lancement de la distribution...",
  );
  const [cycleIndex, setCycleIndex] = useState(0);
  const hasSentReadyNotification = useRef(false);

  useEffect(() => {
    if (status === "completed") {
      setMessage("Votre repas FEATNESS est pret.");

      if (userId && !hasSentReadyNotification.current) {
        hasSentReadyNotification.current = true;
        fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            type: "meal_ready",
            payload: {
              token_id: tokenId,
              meal_name: mealName,
            },
          }),
        }).catch((error: unknown) =>
          console.error(
            JSON.stringify({
              timestamp: new Date().toISOString(),
              source: "dispensing-notify",
              error:
                error instanceof Error ? error.message : "notify call failed",
            }),
          ),
        );
      }

      return;
    }

    hasSentReadyNotification.current = false;

    const timer = window.setTimeout(() => {
      void advancePreparation();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [cycleIndex, mealName, status, tokenId, userId]);

  useEffect(() => {
    if (status !== "completed") {
      setCountdown(10);
      return;
    }

    const interval = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(interval);
          router.push("/");
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [router, status]);

  async function advancePreparation() {
    const nextStatus = getNextStatus(status);

    if (!nextStatus) {
      return;
    }

    try {
      const response = await fetch("/api/dispense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId, status: nextStatus }),
      });

      const body = (await response.json()) as
        | { preparationStatus: PreparationStatus }
        | { error: string };

      if (!response.ok || "error" in body) {
        setMessage(
          "error" in body
            ? body.error
            : "La borne attend encore la confirmation du paiement.",
        );

        if (response.status === 409) {
          setCycleIndex((current) => current + 1);
        }

        return;
      }

      setStatus(body.preparationStatus);
      setCycleIndex((current) => current + 1);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Distribution impossible.",
      );
      setCycleIndex((current) => current + 1);
    }
  }

  const activeStep = getStepIndex(status);
  const progressFill = getProgressFill(status);
  const preparationCopy = getPreparationTypeLabel(mealType);
  const steps = useMemo(
    () => [
      {
        label: "Commande confirmee",
        subLabel: `${mealName} · ${formatEuro(mealPrice)}`,
      },
      {
        label: "Preparation de votre repas",
        subLabel: preparationCopy,
      },
      {
        label: "Finalisation",
        subLabel: "Votre repas est presque pret...",
      },
      {
        label: "Votre repas est pret !",
        subLabel: "Bonne recuperation.",
      },
    ],
    [mealName, mealPrice, preparationCopy],
  );

  return (
    <>
      <main className="dispense-page">
        <section className="timeline">
          {steps.map((step, index) => {
            const isCompleted = index < activeStep || status === "completed";
            const isActive = index === activeStep;

            return (
              <div
                key={step.label}
                className={`timeline-step ${isActive ? "active" : ""} ${
                  isCompleted ? "completed" : ""
                }`}
              >
                <div className="icon-wrap">
                  {index === 1 && isActive ? (
                    <span className="spinner" />
                  ) : index === 2 && isActive ? (
                    <span className="progress-dot" />
                  ) : (
                    <span className={`check-mark ${isCompleted ? "show" : ""}`}>
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                        <path
                          d="M5 12.5 9.2 16.5 19 7.5"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  )}
                </div>

                <div className="step-copy">
                  <p className="step-label">{step.label}</p>
                  {index === 2 ? (
                    <div className="progress-shell" aria-hidden="true">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressFill}%` }}
                      />
                    </div>
                  ) : null}
                  <p className="step-subtitle">{step.subLabel}</p>
                  {index === 3 && status === "completed" ? (
                    <p className="countdown">
                      Retour a l'accueil dans {countdown}s
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
          <p className="message">{message}</p>
        </section>
      </main>

      <style jsx>{`
        .dispense-page {
          min-height: 100vh;
          background: transparent;
          color: #f9fafb;
          display: grid;
          place-items: center;
          padding: 24px;
        }

        .timeline {
          width: min(480px, 100%);
          display: grid;
          gap: 22px;
          padding: 28px;
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(17, 27, 24, 0.96), rgba(11, 19, 18, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.26);
        }

        .timeline-step {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 16px;
          align-items: start;
          color: #4b5563;
        }

        .timeline-step.active {
          color: #f9fafb;
        }

        .timeline-step.completed {
          color: #9ca3af;
        }

        .icon-wrap {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .check-mark {
          color: #374151;
          display: inline-grid;
          place-items: center;
        }

        .check-mark.show {
          color: #10b981;
          animation: draw-check 500ms ease forwards;
        }

        .spinner {
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 3px solid rgba(255, 255, 255, 0.14);
          border-top-color: #10b981;
          animation: spin 1s linear infinite;
        }

        .progress-dot {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #c9a646;
          box-shadow: 0 0 0 8px rgba(201, 166, 70, 0.18);
        }

        .step-copy {
          display: grid;
          gap: 8px;
        }

        .step-label,
        .step-subtitle,
        .countdown,
        .message {
          margin: 0;
        }

        .step-label {
          font-size: 18px;
          font-weight: 600;
        }

        .step-subtitle {
          color: inherit;
          opacity: 0.9;
          font-size: 14px;
        }

        .progress-shell {
          width: 100%;
          height: 10px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #c9a646, #5db78d);
          border-radius: inherit;
          transition: width 1100ms ease;
        }

        .countdown {
          color: #d7e4de;
          font-size: 14px;
        }

        .message {
          color: #95aaa2;
          text-align: center;
          font-size: 13px;
          margin-top: 8px;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes draw-check {
          0% {
            opacity: 0.55;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spinner,
          .check-mark.show,
          .progress-fill {
            animation: none;
            transition: opacity 160ms ease;
          }
        }
      `}</style>
    </>
  );
}
