"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, type Html5QrcodeCameraScanConfig } from "html5-qrcode";

import { isUuid } from "@featness/shared";

type LiveQrScannerProps = {
  onScan: (decodedText: string) => void;
  disabled?: boolean;
  isEnabled?: boolean;
};

const scannerConfig: Html5QrcodeCameraScanConfig = {
  fps: 10,
  qrbox: { width: 220, height: 220 },
  aspectRatio: 1,
  disableFlip: true,
};

export function LiveQrScanner({
  onScan,
  disabled = false,
  isEnabled = false,
}: LiveQrScannerProps) {
  const regionId = useId().replace(/:/g, "");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (disabled || !isEnabled) {
      return;
    }

    let cancelled = false;
    const scanner = new Html5Qrcode(regionId, {
      verbose: false,
    });
    scannerRef.current = scanner;

    async function startScanner() {
      try {
        await scanner.start(
          { facingMode: "environment" },
          scannerConfig,
          async (decodedText) => {
            if (hasScannedRef.current || !isUuid(decodedText.trim())) {
              return;
            }

            hasScannedRef.current = true;

            try {
              await scanner.stop();
            } catch {
              // no-op
            }

            if (!cancelled) {
              onScan(decodedText.trim());
            }
          },
          () => {
            // ignore per-frame decode errors
          },
        );
      } catch (error) {
        if (!cancelled) {
          setCameraError(
            error instanceof Error
              ? error.message
              : "Camera kiosk indisponible.",
          );
        }
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      hasScannedRef.current = false;

      const activeScanner = scannerRef.current;
      scannerRef.current = null;

      if (activeScanner) {
        void activeScanner.stop().catch(() => undefined).finally(() => {
          try {
            activeScanner.clear();
          } catch {
            // no-op
          }
        });
      }
    };
  }, [disabled, isEnabled, onScan, regionId]);

  return (
    <>
      <div
        id={regionId}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          borderRadius: 16,
        }}
      />
      {cameraError ? (
        <p
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            margin: 0,
            color: "#fca5a5",
            fontSize: 12,
            textAlign: "center",
          }}
        >
          Camera indisponible. Utilisez le mode demo.
        </p>
      ) : null}
      <style jsx global>{`
        #${regionId} video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 16px;
        }

        #${regionId} img {
          display: none !important;
        }
      `}</style>
    </>
  );
}
