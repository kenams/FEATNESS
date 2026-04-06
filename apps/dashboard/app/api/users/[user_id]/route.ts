import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-server";

const updateUserSchema = z.object({
  role: z.enum(["user", "owner", "admin"]),
});

type RouteContext = {
  params: Promise<{ user_id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (ownerContext.profile.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as unknown;
  const parsedBody = updateUserSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { user_id } = await params;
  const supabase = getSupabaseServiceRoleClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsedBody.data.role })
    .eq("id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
