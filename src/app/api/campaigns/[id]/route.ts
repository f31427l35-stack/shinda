import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireAuth } from "@/lib/requireAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();

  if (body.is_active === true) {
    await sql`UPDATE campaigns SET is_active = false WHERE is_active = true AND id != ${id}`;
  }

  const { rows } = await sql`
    UPDATE campaigns
    SET name = COALESCE(${body.name}, name),
        keyword = COALESCE(${body.keyword}, keyword),
        prize_description = COALESCE(${body.prize_description}, prize_description),
        is_active = COALESCE(${body.is_active}, is_active)
    WHERE id = ${id}
    RETURNING id, name, keyword, is_active, prize_description, created_at
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  return NextResponse.json({ campaign: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  await sql`DELETE FROM campaigns WHERE id = ${id}`;

  return NextResponse.json({ ok: true });
}
