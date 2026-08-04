import { sql } from "@vercel/postgres";

// Re-export the tagged-template sql client from @vercel/postgres.
// Usage: await sql`SELECT * FROM entries WHERE campaign_id = ${id}`;
// This automatically uses the POSTGRES_URL env var that Vercel injects
// when you attach a Vercel Postgres (Neon) database to your project.
export { sql };
