import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    const { rows } = await sql`
      INSERT INTO website_stats (id, total_clicks)
      VALUES (1, 1)
      ON CONFLICT (id)
      DO UPDATE SET total_clicks = website_stats.total_clicks + 1
      RETURNING total_clicks
    `;

    return NextResponse.json({
      success: true,
      totalClicks: rows[0]?.total_clicks ?? 1,
    });
  } catch (error) {
    console.error("Website click tracking failed:", error);

    return NextResponse.json(
      { success: false, error: "Unable to record website click" },
      { status: 500 }
    );
  }
}
