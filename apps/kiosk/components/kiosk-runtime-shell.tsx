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
    <>
      <KioskHeartbeat kioskId={kioskId} />
      {children}
    </>
  );
}
