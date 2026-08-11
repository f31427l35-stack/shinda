import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ---------------------------------------------------------------------------
// Onfon Media posts USSD session data to this endpoint as the caller
// navigates the menu. Field names can vary slightly by account/config —
// check your Onfon dashboard's "USSD callback payload" sample if these
// don't match. Common fields: SESSIONID / MSISDN / USSDCODE / INPUT /
// NETWORKCODE.
//
// FLOW (2 screens — keeps well inside the 180s USSD session timeout):
//   1. New session       -> show the 5 soap package sizes, prices included
//   2. INPUT = "<size>"   -> create the order (qty 1), fire an UpesiPay
//                           STK push, end the session
//
// Want more than one bottle of a size? Dial in again and pick it again —
// each pass is its own order, so a second STK push goes out.
//
// Response contract stays the same as before: { USERID, MSISDN, MSG,
// MSGTYPE } where MSGTYPE: true = "continue" (show more input), false =
// "end session". Swap in the commented CON/END plain-text version at the
// bottom of `respond()` if your Onfon config expects that instead.
// ---------------------------------------------------------------------------

// TODO: replace these with your mum's real prices per package.
const PRODUCTS = [
  { code: "1", label: "1 Litre", size: "1L", price: 150 },
  { code: "2", label: "2 Litre", size: "2L", price: 280 },
  { code: "3", label: "3 Litre", size: "3L", price: 400 },
  { code: "4", label: "4 Litre", size: "4L", price: 520 },
  { code: "5", label: "5 Litre", size: "5L", price: 650 },
] as const;

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
  // return new NextResponse(`${continueSession ? "CON" : "END"} ${msg}`, {
  //   headers: { "Content-Type": "text/plain" },
  // });
}

// Onfon/Safaricom expect MSISDN in 2547XXXXXXXX format. Callers sometimes
// arrive as 07XXXXXXXX or 7XXXXXXXX depending on network config.
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

function menuText() {
  const lines = PRODUCTS.map((p) => `${p.code}. ${p.label} - KES ${p.price}`);
  return `Welcome to Mama's Liquid Soap!\nChoose a package:\n${lines.join("\n")}`;
}

async function initiateStkPush(phone: string, amount: number, callbackUrl: string) {
  const authToken = Buffer.from(
    `${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`
  ).toString("base64");

  const res = await fetch("https://upesipay.com/api/v2/collections/initiate/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // "wallet" uses your default configured till/paybill for free; swap
      // for a specific registered channel_id if you'd rather use that.
      channel_id: process.env.UPESIPAY_CHANNEL_ID || "wallet",
      phone_number: phone,
      amount,
      callback_url: callbackUrl,
    }),
  });
  const data = await res.json();
  return { ok: res.ok && data.success, data };
}

export async function POST(req: NextRequest) {
  let payload: OnfonPayload;
  let parsedAs: "json" | "formData";
  try {
    payload = await req.json();
    parsedAs = "json";
  } catch {
    const form = await req.formData();
    payload = Object.fromEntries(form.entries()) as unknown as OnfonPayload;
    parsedAs = "formData";
  }

  // TEMP DIAGNOSTIC — remove once we've confirmed Onfon's real field names.
  // Logs the exact keys/values received so we can compare against what the
  // code expects (MSISDN, SESSIONID, INPUT, NEWREQUEST).
  console.log("USSD raw payload", { parsedAs, payload });

  const rawPhone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSIONID || "";
  const rawInput = (payload.INPUT || "").trim();

  if (!rawPhone) {
    console.log("USSD: no MSISDN field found, ending session early", { keysReceived: Object.keys(payload) });
    return respond("Sorry, something went wrong. Please try again.", false, payload);
  }
  const phone = normalizePhone(rawPhone);

  try {
    // Determine "is this a brand-new session" ourselves rather than
    // trusting payload.NEWREQUEST / an empty INPUT — some dial formats
    // (a shortcode with a digit baked in, e.g. *321*2#) send a non-empty
    // INPUT on the very first callback, which would otherwise skip the
    // menu screen entirely and misread that digit as the user's package
    // choice. First time we see a session_id -> it's new -> show the menu,
    // regardless of what INPUT already contains.
    let isNewSession = true;
    if (sessionId) {
      const { rowCount } = await sql`
        INSERT INTO ussd_sessions (session_id) VALUES (${sessionId})
        ON CONFLICT (session_id) DO NOTHING
      `;
      isNewSession = (rowCount ?? 0) > 0;
    }

    // Screen 1: new session -> show package menu.
    if (isNewSession) {
      return respond(menuText(), true, payload);
    }

    // Trail can arrive as just "3" or, on some Onfon configs, the full
    // "3*3" path — either way the package choice is the last segment.
    const segments = rawInput.split("*").map((s) => s.trim());
    const choice = segments[segments.length - 1];

    const product = PRODUCTS.find((p) => p.code === choice);
    if (!product) {
      return respond("Invalid choice. Please try again and pick 1-5.", false, payload);
    }

    const quantity = 1;
    const totalAmount = product.price * quantity;
    const appUrl = process.env.APP_URL || "";
    const callbackUrl = appUrl ? `${appUrl}/api/payment-callback` : "";

    // Create the order first (status: pending) so we have a record even
    // if the STK push call itself fails.
    const { rows: orderRows } = await sql`
      INSERT INTO orders (phone_number, session_id, package_size, quantity, unit_price, total_amount, status)
      VALUES (${phone}, ${sessionId}, ${product.size}, ${quantity}, ${product.price}, ${totalAmount}, 'pending')
      RETURNING id
    `;
    const orderId = orderRows[0].id;

    const { ok, data } = await initiateStkPush(phone, totalAmount, callbackUrl);

    if (!ok) {
      await sql`UPDATE orders SET status = 'failed' WHERE id = ${orderId}`;
      const errMsg = data?.message || "Could not send payment prompt.";
      return respond(`Sorry, ${errMsg} Please try again shortly.`, false, payload);
    }

    await sql`
      UPDATE orders
      SET status = 'awaiting_payment',
          checkout_request_id = ${data.data.checkout_request_id},
          merchant_request_id = ${data.data.merchant_request_id}
      WHERE id = ${orderId}
    `;

    return respond(
      `Order placed: ${product.label} - KES ${totalAmount}.\nEnter your M-PESA PIN on the prompt to complete payment.`,
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
