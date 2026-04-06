"use client";

import type { ReactNode } from "react";

import { KioskHeartbeat } from "@/components/kiosk-heartbeat";
import { KioskOfflineScreen } from "@/components/kiosk-offline-screen";

export function KioskRuntimeShell({ children }: { children: ReactNode }) {
  const kioskId = process.env.NEXT_PUBLIC_KIOSK_ID?.trim() || null;

  if (!kioskId) {
    return <KioskOfflineScreen kioskId={null} />;
  }

  return (
    <div style={shellStyle}>
      <KioskHeartbeat kioskId={kioskId} />
      {children}
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(201,166,70,0.12), transparent 22%), radial-gradient(circle at bottom right, rgba(89,211,154,0.14), transparent 24%), #07110f",
} as const;
