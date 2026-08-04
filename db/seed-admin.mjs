/**
 * Run once after setting up your database to create your first admin login.
 *
 *   node db/seed-admin.mjs "Your Name" "you@example.com" "your-password"
 *
 * Requires POSTGRES_URL to be set in the environment (Vercel CLI's
 * `vercel env pull .env.local` will do this for you locally).
 */
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error('Usage: node db/seed-admin.mjs "Name" "email@example.com" "password"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);

await sql`
  INSERT INTO admin_users (name, email, password_hash, role)
  VALUES (${name}, ${email}, ${hash}, 'admin')
  ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
`;

console.log(`Admin user "${email}" created/updated.`);
process.exit(0);
