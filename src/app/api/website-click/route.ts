import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

const CLIENT_ORIGIN = "https://shinda-clientside.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": CLIENT_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST() {
  try {
    const { rows } = await sql`
      INSERT INTO website_stats (id, total_clicks)
      VALUES (1, 1)
      ON CONFLICT (id)
      DO UPDATE SET total_clicks = website_stats.total_clicks + 1
      RETURNING total_clicks
    `;

    return NextResponse.json(
      {
        success: true,
        totalClicks: rows[0]?.total_clicks ?? 1,
      },
      {
        headers: corsHeaders,
      }
    );
  } catch (error) {
    console.error("Website click tracking failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to record website click",
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
