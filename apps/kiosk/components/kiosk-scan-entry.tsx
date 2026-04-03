"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import { FeatnessLogo } from "@/components/featness-logo";
import {
  KioskOfflineScreen,
  KioskOutOfStockScreen,
} from "@/components/kiosk-offline-screen";
import { LiveQrScanner } from "@/components/live-qr-scanner";
import { useKioskIdentity } from "@/hooks/use-kiosk-identity";

type DemoTokenResponse = {
  token_id: string;
  qr_content: string;
  demo_profile: {
    full_name: string;
    objective: string;
    calories_burned: number;
  };
};

export function KioskScanEntry() {
  const router = useRouter();
  const kioskIdentity = useKioskIdentity();
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [demoToken, setDemoToken] = useState<DemoTokenResponse | null>(null);
  const [isScannerEnabled, setIsScannerEnabled] = useState(false);

  const stockMessage = useMemo(() => {
    if (kioskIdentity.stockUnits === null) {
      return null;
    }

    if (kioskIdentity.isLowStock) {
      return {
        color: "#f59e0b",
        label: `Stock limite · ${kioskIdentity.stockUnits} restants`,
      };
    }

    return {
      color: "#10b981",
      label: `${kioskIdentity.stockUnits} repas disponibles`,
    };
  }, [kioskIdentity.isLowStock, kioskIdentity.stockUnits]);

  const handleTokenDetected = useCallback(
    (tokenValue: string) => {
      router.push(`/session/${tokenValue}`);
    },
    [router],
  );

  async function handleDemoMode() {
    if (!kioskIdentity.kioskId) {
      setMessage("NEXT_PUBLIC_KIOSK_ID est requis pour le mode demo.");
      return;
    }

    setIsBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/demo/create-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kiosk_id: kioskIdentity.kioskId }),
      });

      const payload = (await response.json()) as
        | DemoTokenResponse
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error(
          "error" in payload ? payload.error : "demo_mode_failed",
        );
      }

      setDemoToken(payload);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Mode demo indisponible.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  if (!kioskIdentity.isLoading && kioskIdentity.isOutOfStock) {
    return <KioskOutOfStockScreen kioskId={kioskIdentity.kioskId} />;
  }

  if (!kioskIdentity.isLoading && !kioskIdentity.isActive) {
    return <KioskOfflineScreen kioskId={kioskIdentity.kioskId} />;
  }

  return (
    <>
      <main className="kiosk-home">
        <section className="top-zone">
          <FeatnessLogo
            subtitle="Le repas parfait apres ton effort"
            align="center"
          />
        </section>

        <section className="scan-zone">
          <div className="scan-frame">
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />
            <LiveQrScanner
              onScan={handleTokenDetected}
              disabled={isBusy || Boolean(demoToken)}
              isEnabled={isScannerEnabled}
            />
            {!isScannerEnabled ? (
              <button
                type="button"
                className="activate-camera-button"
                onClick={() => setIsScannerEnabled(true)}
              >
                Activer la camera
              </button>
            ) : null}
          </div>

          <p className="scan-copy">Approchez votre QR code FEATNESS</p>
          {message ? <p className="scan-error">{message}</p> : null}
        </section>

        <section className="bottom-zone">
          {stockMessage ? (
            <div className="stock-chip">
              <span
                className="stock-dot"
                style={{ backgroundColor: stockMessage.color }}
              />
              <span>{stockMessage.label}</span>
            </div>
          ) : (
            <div className="stock-chip loading">Verification du stock...</div>
          )}

          <button
            type="button"
            className="demo-button"
            onClick={() => void handleDemoMode()}
            disabled={isBusy}
          >
            {isBusy ? "Mode demo..." : "Mode demo"}
          </button>
        </section>
      </main>

      {demoToken ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="demo-modal">
            <button
              type="button"
              className="close-button"
              onClick={() => setDemoToken(null)}
              aria-label="Fermer le mode demo"
            >
              ×
            </button>

            <div className="qr-card">
              <QRCodeSVG value={demoToken.qr_content} size={220} />
            </div>

            <p className="modal-copy">Scannez ce QR avec votre mobile FEATNESS</p>
            <div className="separator">ou</div>
            <button
              type="button"
              className="direct-button"
              onClick={() => router.push(`/session/${demoToken.token_id}`)}
            >
              Tester directement sur cette borne →
            </button>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .kiosk-home {
          min-height: 100vh;
          background: #0a0a0a;
          color: #ffffff;
          display: grid;
          grid-template-rows: 20vh 1fr 20vh;
          overflow: hidden;
          padding: 24px;
        }

        .top-zone,
        .scan-zone,
        .bottom-zone {
          display: grid;
          place-items: center;
        }

        .scan-zone {
          gap: 20px;
          align-content: center;
        }

        .scan-frame {
          position: relative;
          width: 280px;
          height: 280px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .activate-camera-button {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          z-index: 3;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(17, 24, 39, 0.92);
          color: #ffffff;
          border-radius: 999px;
          padding: 12px 18px;
          font-size: 14px;
          font-weight: 600;
        }

        .corner {
          position: absolute;
          width: 40px;
          height: 40px;
          border-color: #ffffff;
          border-style: solid;
          border-width: 0;
          opacity: 0.4;
          animation: pulse-corners 2s ease-in-out infinite;
          z-index: 2;
          pointer-events: none;
        }

        .top-left {
          top: 0;
          left: 0;
          border-top-width: 3px;
          border-left-width: 3px;
          border-top-left-radius: 16px;
        }

        .top-right {
          top: 0;
          right: 0;
          border-top-width: 3px;
          border-right-width: 3px;
          border-top-right-radius: 16px;
        }

        .bottom-left {
          bottom: 0;
          left: 0;
          border-bottom-width: 3px;
          border-left-width: 3px;
          border-bottom-left-radius: 16px;
        }

        .bottom-right {
          right: 0;
          bottom: 0;
          border-bottom-width: 3px;
          border-right-width: 3px;
          border-bottom-right-radius: 16px;
        }

        .scan-copy {
          margin: 0;
          font-size: 16px;
          color: #ffffff;
          text-align: center;
        }

        .scan-error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
          text-align: center;
        }

        .bottom-zone {
          align-items: end;
          position: relative;
        }

        .stock-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border-radius: 999px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          color: #d1d5db;
          font-size: 14px;
        }

        .stock-chip.loading {
          color: #6b7280;
        }

        .stock-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
        }

        .demo-button {
          position: absolute;
          right: 0;
          bottom: 0;
          background: transparent;
          border: 1px solid #374151;
          color: #6b7280;
          font-size: 12px;
          border-radius: 999px;
          padding: 10px 14px;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.78);
          display: grid;
          place-items: center;
          padding: 24px;
          z-index: 100;
        }

        .demo-modal {
          position: relative;
          width: min(440px, 100%);
          border-radius: 24px;
          padding: 28px;
          background: #111827;
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: grid;
          justify-items: center;
          gap: 18px;
          text-align: center;
        }

        .close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: transparent;
          color: #d1d5db;
          font-size: 24px;
          line-height: 1;
        }

        .qr-card {
          background: #ffffff;
          padding: 16px;
          border-radius: 20px;
        }

        .modal-copy,
        .separator {
          margin: 0;
          color: #d1d5db;
        }

        .separator {
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 12px;
        }

        .direct-button {
          width: 100%;
          border: none;
          border-radius: 12px;
          padding: 16px;
          background: #10b981;
          color: #ffffff;
          font-size: 16px;
          font-weight: 600;
        }

        @keyframes pulse-corners {
          0%,
          100% {
            opacity: 0.4;
          }
          50% {
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .corner {
            animation: none;
            opacity: 0.8;
          }
        }

        @media (max-width: 720px) {
          .kiosk-home {
            grid-template-rows: auto 1fr auto;
            gap: 24px;
          }

          .demo-button {
            position: static;
            margin-top: 18px;
          }

          .bottom-zone {
            gap: 12px;
            align-items: center;
          }
        }
      `}</style>
    </>
  );
}
