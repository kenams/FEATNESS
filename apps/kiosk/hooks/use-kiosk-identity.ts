"use client";

import { useEffect, useMemo, useState } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase";

export type KioskRow = {
  id: string;
  name: string;
  is_active: boolean;
  stock_units: number;
  stock_alert_threshold: number;
  last_heartbeat_at: string | null;
};

type KioskIdentityState = {
  kioskId: string | null;
  kiosk: KioskRow | null;
  isActive: boolean;
  isLoading: boolean;
  stockUnits: number | null;
  isLowStock: boolean;
  isOutOfStock: boolean;
};

function logKioskIdentity(payload: Record<string, unknown>): void {
  console.error(JSON.stringify(payload));
}

export function useKioskIdentity(): KioskIdentityState {
  const browserSupabase = getSupabaseBrowserClient();
  const kioskId = process.env.NEXT_PUBLIC_KIOSK_ID?.trim() || null;
  const [kiosk, setKiosk] = useState<KioskRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!kioskId) {
      logKioskIdentity({
        timestamp: new Date().toISOString(),
        source: "use-kiosk-identity",
        status: "error",
        error: "NEXT_PUBLIC_KIOSK_ID is missing",
      });
      setIsLoading(false);
      setKiosk(null);
      return;
    }

    if (!browserSupabase) {
      logKioskIdentity({
        timestamp: new Date().toISOString(),
        source: "use-kiosk-identity",
        status: "error",
        kiosk_id: kioskId,
        error: "Supabase browser client unavailable",
      });
      setIsLoading(false);
      setKiosk(null);
      return;
    }

    const supabase = browserSupabase;
    let cancelled = false;
    const channelName = `kiosk-identity-${kioskId}-${Math.random()
      .toString(36)
      .slice(2)}`;

    async function loadKiosk() {
      const { data, error } = await supabase
        .from("kiosks")
        .select("id, name, is_active, stock_units, stock_alert_threshold, last_heartbeat_at")
        .eq("id", kioskId)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        logKioskIdentity({
          timestamp: new Date().toISOString(),
          source: "use-kiosk-identity",
          status: "error",
          kiosk_id: kioskId,
          error: error?.message ?? "kiosk_not_found",
        });
        setKiosk(null);
        setIsLoading(false);
        return;
      }

      setKiosk({
        id: String(data.id),
        name: String(data.name),
        is_active: Boolean(data.is_active),
        stock_units: Number(data.stock_units ?? 0),
        stock_alert_threshold: Number(data.stock_alert_threshold ?? 0),
        last_heartbeat_at: (data.last_heartbeat_at as string | null) ?? null,
      });
      setIsLoading(false);
    }

    void loadKiosk();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kiosks",
          filter: `id=eq.${kioskId}`,
        },
        (
          payload: RealtimePostgresChangesPayload<{
            id: string;
            name: string;
            is_active: boolean;
            stock_units: number;
            stock_alert_threshold: number;
            last_heartbeat_at: string | null;
          }>,
        ) => {
          const row = payload.new;

          if (!row || !("id" in row)) {
            return;
          }

          setKiosk({
            id: String(row.id),
            name: String(row.name),
            is_active: Boolean(row.is_active),
            stock_units: Number(row.stock_units ?? 0),
            stock_alert_threshold: Number(row.stock_alert_threshold ?? 0),
            last_heartbeat_at: row.last_heartbeat_at ?? null,
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [browserSupabase, kioskId]);

  return useMemo(() => {
    const stockUnits = kiosk ? kiosk.stock_units : null;
    const threshold = kiosk ? kiosk.stock_alert_threshold : 0;
    const isActive = kioskId !== null && Boolean(kiosk?.is_active);

    return {
      kioskId,
      kiosk,
      isActive,
      isLoading,
      stockUnits,
      isLowStock: stockUnits !== null && stockUnits > 0 && stockUnits <= threshold,
      isOutOfStock: stockUnits === 0,
    };
  }, [isLoading, kiosk, kioskId]);
}
