import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`SELECT amount, enabled FROM bonus_settings WHERE id = 1`;
  return NextResponse.json({ settings: rows[0] || { amount: 0, enabled: false } });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { amount, enabled } = await req.json();

  const numAmount = Number(amount);
  if (!Number.isFinite(numAmount) || numAmount < 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  const { rows } = await sql`
    UPDATE bonus_settings
    SET amount = ${numAmount}, enabled = ${Boolean(enabled)}, updated_at = now()
    WHERE id = 1
    RETURNING amount, enabled
  `;

  return NextResponse.json({ settings: rows[0] });
}
