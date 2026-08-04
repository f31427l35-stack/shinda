import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await req.json();

  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;

  const { rows } = await sql`
    UPDATE admin_users
    SET name = COALESCE(${body.name}, name),
        email = COALESCE(${body.email}, email),
        role = COALESCE(${body.role}, role),
        password_hash = COALESCE(${passwordHash}, password_hash)
    WHERE id = ${id}
    RETURNING id, name, email, role, created_at
  `;

  if (rows.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: rows[0] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  if (Number(id) === auth.user.id) {
    return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });
  }

  await sql`DELETE FROM admin_users WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
