"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type KioskLiveStatusProps = {
  kioskId: string;
  initialHeartbeat: string | null;
  initialActive: boolean;
};

function formatHeartbeat(dateValue: string | null): string {
  if (!dateValue) {
    return "jamais";
  }

  const diffMs = Date.now() - new Date(dateValue).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "a l'instant";
  }

  if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`;
  }

  return `il y a ${Math.round(diffMinutes / 60)} h`;
}

export function KioskLiveStatus({
  kioskId,
  initialHeartbeat,
  initialActive,
}: KioskLiveStatusProps) {
  const [heartbeat, setHeartbeat] = useState<string | null>(initialHeartbeat);
  const [isActive, setIsActive] = useState(initialActive);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const channel = supabase
      .channel(`kiosk-status-${kioskId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "kiosks",
          filter: `id=eq.${kioskId}`,
        },
        (
          payload: RealtimePostgresChangesPayload<{
            last_heartbeat_at: string | null;
            is_active: boolean | null;
          }>,
        ) => {
          const next = payload.new as { last_heartbeat_at?: string | null; is_active?: boolean };
          setHeartbeat(next.last_heartbeat_at ?? null);
          setIsActive(next.is_active ?? true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [kioskId, supabase]);

  const status = useMemo(() => {
    if (!isActive) {
      return { label: "Hors service", classes: "bg-red-100 text-red-700" };
    }

    if (!heartbeat || new Date(heartbeat).getTime() < Date.now() - 10 * 60 * 1000) {
      return { label: "Inactif", classes: "bg-orange-100 text-orange-700" };
    }

    return { label: "Actif", classes: "bg-emerald-100 text-emerald-700" };
  }, [heartbeat, isActive]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.classes}`}>
        {status.label}
      </span>
      <span className="text-sm text-featness-muted">
        Dernier heartbeat : {formatHeartbeat(heartbeat)}
      </span>
    </div>
  );
}
