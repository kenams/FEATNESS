"use client";

import { useEffect, useRef } from "react";

type KioskHeartbeatProps = {
  kioskId: string | null;
};

function logHeartbeat(payload: Record<string, unknown>): void {
  console.error(JSON.stringify(payload));
}

export function KioskHeartbeat({ kioskId }: KioskHeartbeatProps) {
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!kioskId) {
      logHeartbeat({
        timestamp: new Date().toISOString(),
        source: "kiosk-heartbeat",
        status: "error",
        error: "NEXT_PUBLIC_KIOSK_ID is missing",
      });
      return;
    }

    async function sendHeartbeat() {
      try {
        const response = await fetch("/api/heartbeat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ kiosk_id: kioskId }),
        });

        if (!response.ok) {
          const body = (await response.json()) as { error?: string };
          throw new Error(body.error ?? "Heartbeat request failed");
        }
      } catch (error) {
        logHeartbeat({
          timestamp: new Date().toISOString(),
          source: "kiosk-heartbeat",
          kiosk_id: kioskId,
          status: "error",
          error: error instanceof Error ? error.message : "Heartbeat failed",
        });
      }
    }

    void sendHeartbeat();
    timerRef.current = window.setInterval(() => {
      void sendHeartbeat();
    }, 5 * 60 * 1000);

    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [kioskId]);

  return null;
}
