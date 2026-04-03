import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

const toggleMealSchema = z.object({
  isAvailable: z.boolean(),
});

type RouteContext = {
  params: Promise<{ meal_id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as unknown;
  const parsedBody = toggleMealSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { meal_id } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("drink_blends")
    .update({ is_available: parsedBody.data.isAvailable })
    .eq("id", meal_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
