import { NextResponse } from "next/server";
import { z } from "zod";

import { isAuthorizedKioskRequest } from "@/lib/kiosk-internal-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const heartbeatSchema = z.object({
  kiosk_id: z.string().trim().min(1),
});

function logHeartbeat(payload: Record<string, unknown>): void {
  console.error(JSON.stringify(payload));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = heartbeatSchema.safeParse(await request.json());

    if (!body.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const kioskId = body.data.kiosk_id;

    if (!isAuthorizedKioskRequest(request, kioskId)) {
      logHeartbeat({
        timestamp: new Date().toISOString(),
        kiosk_id: kioskId,
        status: "error",
        error: "unauthorized",
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const client = getSupabaseAdminClient();
    const updatedAt = new Date().toISOString();
    const { data, error } = await client
      .from("kiosks")
      .update({ last_heartbeat_at: updatedAt })
      .eq("id", kioskId)
      .select("id")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      logHeartbeat({
        timestamp: updatedAt,
        kiosk_id: kioskId,
        status: "error",
        error: "kiosk_not_found",
      });
      return NextResponse.json({ error: "kiosk_not_found" }, { status: 404 });
    }

    console.info(
      JSON.stringify({
        timestamp: updatedAt,
        kiosk_id: kioskId,
        status: "ok",
      }),
    );

    return NextResponse.json({ ok: true, updated_at: updatedAt });
  } catch (error) {
    logHeartbeat({
      timestamp: new Date().toISOString(),
      status: "error",
      error: error instanceof Error ? error.message : "heartbeat_failed",
    });

    return NextResponse.json({ error: "heartbeat_failed" }, { status: 500 });
  }
}
