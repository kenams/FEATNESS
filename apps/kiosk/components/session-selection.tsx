"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { WorkoutSessionRecord } from "@featness/shared";

import { FeatnessLogo } from "@/components/featness-logo";
import { getFirstName, getGoalBadgeColor, getGoalLabel, getIntensityLabel, getPreparationAccent, getPreparationTypeLabel, getSportLabel, formatEuro } from "@/lib/kiosk-display";
import type { SelectableMeal } from "@/lib/meal-catalog";

type SessionSelectionProps = {
  tokenId: string;
  meals: SelectableMeal[];
  memberName: string | null;
  session: WorkoutSessionRecord;
};

export function SessionSelection({
  tokenId,
  meals,
  memberName,
  session,
}: SessionSelectionProps) {
  const router = useRouter();
  const [selectedMealId, setSelectedMealId] = useState(meals[0]?.id ?? "");

  return (
    <>
      <main className="selection-page">
        <header className="header">
          <div className="logo-wrap">
            <FeatnessLogo size={20} align="left" />
          </div>
          <h1 className="title">Choisissez votre repas</h1>
          <div className="member-summary">
            <span className="member-name">{getFirstName(memberName)}</span>
            <span
              className="goal-badge"
              style={{ backgroundColor: getGoalBadgeColor(session.workout.goal) }}
            >
              {getGoalLabel(session.workout.goal)}
            </span>
          </div>
        </header>

        <p className="workout-line">
          {session.workout.durationMin} min · {getSportLabel(session.workout.sport)} ·{" "}
          {getIntensityLabel(session.workout.intensity)} ·{" "}
          {session.recommendation.caloriesBurned} kcal brulees
        </p>

        <section className="cards-grid">
          {meals.map((meal, index) => {
            const isSelected = selectedMealId === meal.id;
            const badgeLabel =
              index === 0 ? "Recommande" : `Option ${index + 1}`;

            return (
              <button
                key={meal.id}
                type="button"
                className={`meal-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedMealId(meal.id)}
              >
                <span
                  className="accent-bar"
                  style={{ backgroundColor: getPreparationAccent(meal.preparationType) }}
                />
                <div className="card-top">
                  <span className={`rank-badge ${index === 0 ? "primary" : ""}`}>
                    {badgeLabel}
                  </span>
                </div>
                <h2 className="meal-name">{meal.name}</h2>
                <p className="meal-type">
                  {getPreparationTypeLabel(meal.preparationType)}
                </p>
                <div className="macro-row">
                  <span>{meal.calories} kcal</span>
                  <span>{meal.proteinG}g prot</span>
                  <span>{meal.carbsG}g glu</span>
                  <span>{meal.fatG}g lip</span>
                </div>
                <div className="price-wrap">{formatEuro(meal.priceEur)}</div>
              </button>
            );
          })}
        </section>

        <footer className="footer">
          <button
            type="button"
            className="confirm-button"
            disabled={!selectedMealId}
            onClick={() =>
              router.push(`/payment/${tokenId}?meal_id=${selectedMealId}`)
            }
          >
            Confirmer ce repas
          </button>
        </footer>
      </main>

      <style jsx>{`
        .selection-page {
          min-height: 100vh;
          background: transparent;
          color: #f9fafb;
          padding: 24px 28px 36px;
          display: grid;
          grid-template-rows: auto auto 1fr auto;
          gap: 22px;
        }

        .header {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 16px;
          min-height: 64px;
        }

        .logo-wrap {
          justify-self: start;
        }

        .title {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          text-align: center;
        }

        .member-summary {
          justify-self: end;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .member-name {
          color: #e5e7eb;
          font-size: 14px;
        }

        .goal-badge {
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          border-radius: 999px;
          padding: 8px 12px;
        }

        .workout-line {
          margin: 0;
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          padding: 0 8px;
          align-items: stretch;
        }

        .meal-card {
          position: relative;
          min-width: 0;
          background:
            linear-gradient(180deg, rgba(17, 27, 24, 0.96), rgba(11, 19, 18, 0.98));
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f9fafb;
          border-radius: 24px;
          padding: 24px;
          display: grid;
          gap: 16px;
          text-align: left;
          transform: scale(1);
          transition: transform 180ms ease, border-color 180ms ease;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
        }

        .meal-card.selected {
          border: 2px solid #c9a646;
          transform: translateY(-2px);
          box-shadow: 0 28px 80px rgba(201, 166, 70, 0.16);
        }

        .accent-bar {
          position: absolute;
          inset: 0 0 auto 0;
          height: 6px;
        }

        .card-top {
          display: flex;
          justify-content: flex-end;
        }

        .rank-badge {
          border-radius: 999px;
          padding: 8px 12px;
          background: #1f2937;
          color: #9ca3af;
          font-size: 12px;
          font-weight: 600;
        }

        .rank-badge.primary {
          background: linear-gradient(135deg, #d1b05a, #c19a36);
          color: #08110f;
          animation: pulse 2s ease-in-out infinite;
        }

        .meal-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .meal-type {
          margin: -8px 0 0;
          color: #9ca3af;
          font-size: 12px;
        }

        .macro-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .macro-row span {
          background: rgba(255, 255, 255, 0.06);
          border-radius: 999px;
          padding: 8px 10px;
          font-size: 12px;
          color: #d1d5db;
        }

        .price-wrap {
          margin-top: auto;
          justify-self: end;
          font-size: 24px;
          font-weight: 700;
          color: #f2dc9c;
        }

        .footer {
          display: flex;
          justify-content: center;
        }

        .confirm-button {
          width: min(560px, 100%);
          min-height: 60px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #d1b05a, #c19a36);
          color: #08110f;
          font-size: 16px;
          font-weight: 700;
          transition: transform 120ms ease, background 120ms ease;
          box-shadow: 0 18px 42px rgba(201, 166, 70, 0.2);
        }

        .confirm-button:active {
          transform: scale(0.98);
        }

        .confirm-button:disabled {
          background: #1f2937;
          color: #6b7280;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .meal-card,
          .confirm-button,
          .rank-badge.primary {
            transition: none;
            animation: none;
          }
        }

        @media (max-width: 1100px) {
          .cards-grid {
            grid-template-columns: 1fr;
          }

          .header {
            grid-template-columns: 1fr;
            justify-items: center;
          }

          .logo-wrap,
          .member-summary {
            justify-self: center;
          }
        }
      `}</style>
    </>
  );
}
