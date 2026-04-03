import { NextResponse } from "next/server";
import { z } from "zod";

import { hasServiceRoleAuthorization, isSameOriginKioskRequest } from "@/lib/kiosk-internal-auth";
import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const notifySchema = z.object({
  user_id: z.string().trim().min(1).nullable().optional(),
  type: z.enum(["payment_confirmed", "meal_ready"]),
  payload: z.record(z.string(), z.unknown()).optional(),
});

function truncatePushToken(token: string): string {
  if (token.length <= 14) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function logNotify(payload: Record<string, unknown>): void {
  console.info(JSON.stringify(payload));
}

function isNotifyAuthorized(request: Request, type: "payment_confirmed" | "meal_ready"): boolean {
  if (hasServiceRoleAuthorization(request)) {
    return true;
  }

  if (type !== "meal_ready") {
    return false;
  }

  return isSameOriginKioskRequest(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = notifySchema.safeParse(await request.json());

    if (!body.success) {
      return NextResponse.json({ sent: false, reason: "invalid_body" }, { status: 400 });
    }

    const { user_id, type, payload } = body.data;

    if (!isNotifyAuthorized(request, type)) {
      return NextResponse.json({ sent: false, reason: "unauthorized" }, { status: 401 });
    }

    if (!user_id) {
      return NextResponse.json({ sent: false, reason: "no_user" });
    }

    const client = getSupabaseAdminClient();
    const { data: profileRow, error: profileError } = await client
      .from("profiles")
      .select("expo_push_token")
      .eq("id", user_id)
      .maybeSingle();

    if (profileError) {
      logNotify({
        timestamp: new Date().toISOString(),
        user_id,
        type,
        status: "error",
        error: profileError.message,
      });
      return NextResponse.json({ sent: false, reason: "profile_lookup_failed" });
    }

    const expoPushToken = profileRow?.expo_push_token as string | null | undefined;

    if (!expoPushToken) {
      return NextResponse.json({ sent: false, reason: "no_token" });
    }

    const message =
      type === "payment_confirmed"
        ? {
            title: "Paiement confirme",
            body: "Votre repas FEATNESS est en preparation...",
          }
        : {
            title: "Votre repas est pret !",
            body: "Bonne recuperation ! Recuperez votre repas a la borne.",
          };

    const expoResponse = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: message.title,
        body: message.body,
        data: payload ?? {},
      }),
    });

    const expoBody = (await expoResponse.json()) as unknown;

    logNotify({
      timestamp: new Date().toISOString(),
      user_id,
      type,
      expo_push_token: truncatePushToken(expoPushToken),
      status: expoResponse.ok ? "ok" : "error",
      expo_response: expoBody,
    });

    return NextResponse.json({ sent: expoResponse.ok });
  } catch (error) {
    logNotify({
      timestamp: new Date().toISOString(),
      status: "error",
      error: error instanceof Error ? error.message : "notify_failed",
    });
    return NextResponse.json({ sent: false, reason: "notify_failed" });
  }
}
