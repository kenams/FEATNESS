import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getOwnerSessionOrNull } from "@/lib/auth";
import { getOwnerAnalyticsExportRows } from "@/lib/data";

function escapeCsvValue(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const normalized = String(value);

  if (normalized.includes(",") || normalized.includes("\"") || normalized.includes("\n")) {
    return `"${normalized.replaceAll("\"", "\"\"")}"`;
  }

  return normalized;
}

export async function GET(request: Request): Promise<NextResponse> {
  const ownerContext = await getOwnerSessionOrNull(cookies());

  if (!ownerContext) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") ?? undefined;
  const kiosk = searchParams.get("kiosk") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const meal = searchParams.get("meal") ?? undefined;
  const rows = await getOwnerAnalyticsExportRows(
    ownerContext.profile.id,
    range,
    kiosk,
    status,
    meal,
  );
  const header = [
    "payment_id",
    "created_at",
    "paid_at",
    "status",
    "kiosk_id",
    "kiosk_name",
    "meal_id",
    "meal_name",
    "user_id",
    "amount_eur",
  ];
  const csvLines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.paymentId,
        row.createdAt,
        row.paidAt,
        row.status,
        row.kioskId,
        row.kioskName,
        row.mealId,
        row.mealName,
        row.userId,
        row.amountEur.toFixed(2),
      ]
        .map(escapeCsvValue)
        .join(","),
    ),
  ];
  const fileSuffix = `${range ?? "30d"}${kiosk ? `-${kiosk}` : "-all-kiosks"}${
    status ? `-${status}` : ""
  }${meal ? `-${meal}` : ""}`;

  return new NextResponse(csvLines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="featness-analytics-${fileSuffix}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
