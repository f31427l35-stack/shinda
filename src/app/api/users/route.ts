import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAuth";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { rows } = await sql`
    SELECT id, name, email, role, created_at FROM admin_users ORDER BY created_at ASC
  `;

  return NextResponse.json({ users: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await sql`
      INSERT INTO admin_users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${passwordHash}, ${role === "admin" ? "admin" : "presenter"})
      RETURNING id, name, email, role, created_at
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
