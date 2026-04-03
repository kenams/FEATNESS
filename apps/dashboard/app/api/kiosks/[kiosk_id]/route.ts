import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getKioskByOwner } from "@/lib/data";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

const updateKioskSchema = z
  .object({
    stockUnits: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => value.stockUnits !== undefined || value.isActive !== undefined, {
    message: "Aucune modification fournie",
  });

type RouteContext = {
  params: Promise<{ kiosk_id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { kiosk_id } = await params;
  const kiosk = await getKioskByOwner(ownerContext.profile.id, kiosk_id);

  if (!kiosk) {
    return NextResponse.json({ error: "borne_introuvable" }, { status: 404 });
  }

  const body = (await request.json()) as unknown;
  const parsedBody = updateKioskSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const payload: Record<string, unknown> = {};

  if (parsedBody.data.stockUnits !== undefined) {
    payload.stock_units = parsedBody.data.stockUnits;
  }

  if (parsedBody.data.isActive !== undefined) {
    payload.is_active = parsedBody.data.isActive;
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("kiosks")
    .update(payload)
    .eq("id", kiosk_id)
    .eq("owner_id", ownerContext.profile.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
