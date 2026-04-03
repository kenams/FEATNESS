import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

const createKioskSchema = z.object({
  name: z.string().trim().min(2),
  kioskId: z.string().trim().regex(/^[A-Z0-9-]+$/),
  locationAddress: z.string().trim().min(2),
  locationCity: z.string().trim().min(2),
  stockUnits: z.number().int().min(0),
  stockAlertThreshold: z.number().int().min(0),
});

export async function POST(request: Request): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as unknown;
  const parsedBody = createKioskSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: existingKiosk } = await supabase
    .from("kiosks")
    .select("id")
    .eq("id", parsedBody.data.kioskId)
    .maybeSingle();

  if (existingKiosk) {
    return NextResponse.json(
      { error: "Cet identifiant de borne existe deja." },
      { status: 409 },
    );
  }

  const { error } = await supabase.from("kiosks").insert({
    id: parsedBody.data.kioskId,
    name: parsedBody.data.name,
    location_address: parsedBody.data.locationAddress,
    location_city: parsedBody.data.locationCity,
    owner_id: ownerContext.profile.id,
    stock_units: parsedBody.data.stockUnits,
    stock_alert_threshold: parsedBody.data.stockAlertThreshold,
    is_active: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ kioskId: parsedBody.data.kioskId });
}
