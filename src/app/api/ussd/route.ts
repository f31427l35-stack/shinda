import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Onfon Media posts USSD session data to this endpoint as the caller
// navigates the menu. Exact field names can vary slightly by account/config —
// check your Onfon dashboard's "USSD callback payload" sample and adjust the
// destructuring below to match. Common fields: SESSIONID / MSISDN / USSDCODE
// / INPUT / NETWORKCODE.
//
// Response contract: Onfon (like most Kenyan USSD aggregators) expects a
// small JSON or plain-text response indicating whether to continue the
// session (show another menu) or end it (final message, session closes).
// This implementation returns the common { "USERID", "MSISDN", "MSG",
// "MSGTYPE" } shape used by Onfon's API — MSGTYPE: true means "continue"
// (show more input), MSGTYPE: false means "end session".
// If your Onfon setup expects the alternate CON/END plain-text format
// instead, swap the two `respond()` calls at the bottom for the commented
// plain-text version.

type OnfonPayload = {
  USERID?: string;
  MSISDN?: string;
  SESSIONID?: string;
  INPUT?: string;
  NEWREQUEST?: string; // "1" on first dial, "0" on subsequent input
  USSDCODE?: string;
};

function respond(msg: string, continueSession: boolean, extra: Partial<OnfonPayload> = {}) {
  return NextResponse.json({
    USERID: extra.USERID ?? "",
    MSISDN: extra.MSISDN ?? "",
    MSG: msg,
    MSGTYPE: continueSession,
  });

  // --- Alternate plain-text CON/END format (Africa's Talking style) ---
  // Uncomment this and comment out the JSON response above if your Onfon
  // endpoint config expects plain text instead of JSON.
  //
  // return new NextResponse(`${continueSession ? "CON" : "END"} ${msg}`, {
  //   headers: { "Content-Type": "text/plain" },
  // });
}

export async function POST(req: NextRequest) {
  let payload: OnfonPayload;
  try {
    payload = await req.json();
  } catch {
    // Some aggregators send form-encoded data instead of JSON.
    const form = await req.formData();
    payload = Object.fromEntries(form.entries()) as unknown as OnfonPayload;
  }

  const phone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSIONID || "";
  const isNewSession = payload.NEWREQUEST === "1" || !payload.INPUT;
  const rawInput = (payload.INPUT || "").trim();

  if (!phone) {
    return respond("Sorry, something went wrong. Please try again.", false, payload);
  }

  try {
    // Find the currently active campaign.
    const { rows: campaignRows } = await sql`
      SELECT id, name, keyword, prize_description
      FROM campaigns
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (campaignRows.length === 0) {
      return respond("No active promotion right now. Please check back soon.", false, payload);
    }

    const campaign = campaignRows[0];

    // First screen: ask for the keyword.
    if (isNewSession) {
      return respond(
        `Welcome! Enter the keyword announced on air to enter the draw for: ${campaign.prize_description || campaign.name}`,
        true,
        payload
      );
    }

    // Subsequent screen: they typed something — validate against the keyword.
    // On multi-step USSD menus, INPUT often arrives as the full "1*2*3" trail;
    // take the last segment as the actual keyword entry.
    const lastEntry = rawInput.split("*").pop()?.trim().toLowerCase() || "";
    const validKeyword = campaign.keyword.trim().toLowerCase();

    if (lastEntry !== validKeyword) {
      return respond(
        `Sorry, that code isn't correct. Please try again with the exact keyword announced on air.`,
        false,
        payload
      );
    }

    // Valid entry — log it. Unlimited entries allowed, so no uniqueness check.
    await sql`
      INSERT INTO entries (campaign_id, phone_number, session_id, raw_input)
      VALUES (${campaign.id}, ${phone}, ${sessionId}, ${rawInput})
    `;

    return respond(
      `You're entered! Good luck in the draw for: ${campaign.prize_description || campaign.name}. Winners will be announced on air.`,
      false,
      payload
    );
  } catch (err) {
    console.error("USSD webhook error:", err);
    return respond("Sorry, something went wrong. Please try again shortly.", false, payload);
  }
}

// Some aggregators verify the endpoint with a GET before saving it.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
