import { NextResponse } from "next/server";

import { isExpired, isUuid, type PreparationStatus } from "@featness/shared";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

const ALLOWED_STATUSES: PreparationStatus[] = [
  "scanned",
  "queued",
  "mixing",
  "ready",
  "completed",
];

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      tokenId?: string;
      status?: PreparationStatus;
    };

    const tokenId = body.tokenId?.trim() || "";
    const nextStatus = body.status;

    if (!isUuid(tokenId)) {
      return NextResponse.json(
        { error: "Le token FEATNESS doit etre un UUID valide." },
        { status: 400 },
      );
    }

    if (!nextStatus || !ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json(
        { error: "Statut de preparation invalide." },
        { status: 400 },
      );
    }

    const client = getSupabaseAdminClient();
    const { data: tokenRow, error: tokenError } = await client
      .from("dispense_tokens")
      .select("*")
      .eq("id", tokenId)
      .maybeSingle();

    if (tokenError) {
      throw tokenError;
    }

    if (!tokenRow) {
      return NextResponse.json(
        { error: "Token FEATNESS introuvable." },
        { status: 404 },
      );
    }

    if (
      tokenRow.status !== "confirmed" &&
      !(tokenRow.status === "consumed" && nextStatus === "completed")
    ) {
      return NextResponse.json(
        { error: `Le token n'est pas pret pour la distribution (${tokenRow.status}).` },
        { status: 409 },
      );
    }

    if (isExpired(String(tokenRow.expires_at)) && tokenRow.status === "confirmed") {
      await client
        .from("dispense_tokens")
        .update({ status: "expired" })
        .eq("id", tokenId);

      return NextResponse.json(
        { error: "Le token FEATNESS a expire avant distribution." },
        { status: 410 },
      );
    }

    const { data: sessionRow, error: sessionError } = await client
      .from("workout_sessions")
      .update({ preparation_status: nextStatus })
      .eq("id", tokenRow.session_id)
      .select("*")
      .single();

    if (sessionError) {
      throw sessionError;
    }

    if (nextStatus === "completed") {
      const { error: consumeError } = await client
        .from("dispense_tokens")
        .update({
          status: "consumed",
          consumed_at: new Date().toISOString(),
        })
        .eq("id", tokenId);

      if (consumeError) {
        throw consumeError;
      }
    }

    return NextResponse.json({
      tokenId,
      sessionId: tokenRow.session_id,
      preparationStatus: sessionRow.preparation_status,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "La mise a jour de preparation a echoue.",
      },
      { status: 500 },
    );
  }
}
