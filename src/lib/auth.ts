import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { sql } from "@/lib/db";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const COOKIE_NAME = "session";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "presenter";
};

// Only `id` is trusted from the signed cookie — name/email/role are always
// re-read fresh from the DB below, so a deleted or edited account can't
// keep acting on stale claims for the life of the token.
type SessionToken = { id: number };

export function signSession(user: SessionUser): string {
  const payload: SessionToken = { id: user.id };
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export async function setSessionCookie(user: SessionUser) {
  const token = signSession(user);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let decoded: SessionToken;
  try {
    decoded = jwt.verify(token, SECRET) as SessionToken;
  } catch {
    return null;
  }

  // Always confirm the account still exists (and pull its current
  // name/email/role) rather than trusting whatever was true at login time.
  // This is what makes a deleted account stop working immediately instead
  // of staying valid for the rest of the token's 7-day life.
  try {
    const { rows } = await sql`
      SELECT id, name, email, role FROM admin_users WHERE id = ${decoded.id}
    `;
    const user = rows[0];
    if (!user) {
      await store.delete(COOKIE_NAME);
      return null;
    }
    return user as SessionUser;
  } catch {
    // DB unreachable — fail closed rather than trusting the stale token.
    return null;
  }
}
