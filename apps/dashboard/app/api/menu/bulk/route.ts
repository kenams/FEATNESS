import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

const bulkMealSchema = z.object({
  mealIds: z.array(z.string().uuid()).min(1),
  isAvailable: z.boolean(),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as unknown;
  const parsedBody = bulkMealSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("drink_blends")
    .update({ is_available: parsedBody.data.isAvailable })
    .in("id", parsedBody.data.mealIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
