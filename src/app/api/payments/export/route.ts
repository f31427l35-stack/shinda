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
    SELECT phone_number, receipt_number, total_amount, paid_at
    FROM orders
    WHERE status = 'paid'
      AND (${isAdmin} OR paid_at >= ${businessDayStart})
    ORDER BY paid_at DESC
  `;

  const header = ["Phone Number", "Transaction Reference", "Amount (KES)", "Paid At"];
  const lines = [header.join(",")];

  for (const r of rows) {
    lines.push(
      [
        csvValue(r.phone_number),
        csvValue(r.receipt_number),
        csvValue(scaleAmount(r.total_amount, percent)),
        csvValue(new Date(r.paid_at).toLocaleString("en-KE")),
      ].join(",")
    );
  }

  const csv = lines.join("\n");
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="payments-${today}.csv"`,
    },
  });
}
