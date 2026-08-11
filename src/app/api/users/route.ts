import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`
    SELECT id, name, email, role, revenue_view_percent, created_at FROM admin_users ORDER BY created_at ASC
  `;

  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { name, email, password, role, revenue_view_percent } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  let percent = 100;
  if (revenue_view_percent !== undefined && revenue_view_percent !== null && revenue_view_percent !== "") {
    percent = Number(revenue_view_percent);
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
      return NextResponse.json({ error: "Revenue view % must be between 1 and 100." }, { status: 400 });
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await sql`
      INSERT INTO admin_users (name, email, password_hash, role, revenue_view_percent)
      VALUES (${name}, ${email}, ${passwordHash}, ${role === "admin" ? "admin" : "presenter"}, ${percent})
      RETURNING id, name, email, role, revenue_view_percent, created_at
    `;
    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (err: any) {
    if (err?.code === "23505") {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Failed to create user." }, { status: 500 });
  }
}
