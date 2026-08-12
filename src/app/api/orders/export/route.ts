import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";
import { getRevenueViewPercent, scaleAmount } from "@/lib/viewPercent";

function csvValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const isAdmin = auth.user.role === "admin";
  const percent = isAdmin ? await getRevenueViewPercent(auth.user.id) : 100;

  const { rows: boundaryRows } = await sql`
    SELECT date_trunc('day', now() AT TIME ZONE 'Africa/Nairobi') AT TIME ZONE 'Africa/Nairobi' AS business_day_start
  `;
  const businessDayStart = boundaryRows[0].business_day_start;

  const { rows } = await sql`
    SELECT phone_number, package_size, quantity, total_amount, status, paid_at, created_at
    FROM orders
    WHERE (${isAdmin} OR created_at >= ${businessDayStart})
    ORDER BY created_at DESC
  `;

  const header = [
    "Phone Number",
    "Size",
    "Quantity",
    "Amount Paid (KES)",
    "Status",
    "Date & Time Paid",
    "Date & Time Ordered",
  ];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvValue(r.phone_number),
        csvValue(r.package_size),
        csvValue(r.quantity),
        csvValue(scaleAmount(r.total_amount, percent)),
        csvValue(r.status),
        csvValue(r.paid_at ? new Date(r.paid_at).toLocaleString("en-KE") : ""),
        csvValue(new Date(r.created_at).toLocaleString("en-KE")),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="soap-orders-${today}.csv"`,
    },
  });
}
