import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

const BOXES = ["Box 1", "Box 2", "Box 3", "Box 4", "Box 5"] as const;

function getPureRandomValue(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

async function loadSystemConfig() {
  const defaults = { minPrice: 100, maxPrice: 1000, minWin: 50, maxWin: 500, winProbability: 20, milestone: 10 };
  try {
    const { rows } = await runWithTimeout(sql`SELECT package_size, price FROM product_prices`, 1500);
    const lookup = (key: string, fb: number) => {
      const found = rows.find(r => r.package_size === key);
      if (!found || isNaN(Number(found.price)) || Number(found.price) <= 0) return fb;
      return Number(found.price);
    };
    return {
      minPrice: lookup('MIN', defaults.minPrice), maxPrice: lookup('MAX', defaults.maxPrice),
      minWin: lookup('MIN_WIN', defaults.minWin), maxWin: lookup('MAX_WIN', defaults.maxWin),
      winProbability: lookup('WIN_PROB', defaults.winProbability), milestone: lookup('MILESTONE', defaults.milestone)
    };
  } catch {
    return defaults;
  }
}

type OnfonPayload = { USERID?: string; MSISDN?: string; SESSION_ID?: string; SESSIONID?: string; USSD_STRING?: string; INPUT?: string; };

function respond(msg: string, continueSession: boolean) {
  const prefix = continueSession ? "CON" : "END";
  return new NextResponse(`${prefix} ${msg}`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    },
  });
}

const runWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Database execution timeout")), ms)),
  ]);
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  return "254" + digits;
}

async function initiateStkPush(phone: string, amount: number, callbackUrl: string) {
  const authToken = Buffer.from(`${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`).toString("base64");
  const res = await fetch("https://upesipay.com", {
    method: "POST",
    headers: { Authorization: `Basic ${authToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      channel_id: process.env.UPESIPAY_CHANNEL_ID || "wallet",
      phone_number: phone,
      amount,
      callback_url: callbackUrl,
    }),
  });
  const text = await res.text();
  try { return { ok: res.ok && JSON.parse(text).success === true, data: JSON.parse(text) }; } catch { return { ok: false, data: {} }; }
}

export async function POST(req: NextRequest) {
  let payload: OnfonPayload;
  const rawBody = await req.text();
  try { payload = JSON.parse(rawBody); } catch { payload = Object.fromEntries(new URLSearchParams(rawBody).entries()); }

  const rawPhone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSION_ID || payload.SESSIONID || "";
  const rawInput = (payload.USSD_STRING || payload.INPUT || "").trim();

  if (!rawPhone) return respond("Sorry, something went wrong.", false);
  const phone = normalizePhone(rawPhone);
  const config = await loadSystemConfig();

  try {
    let isNewSession = true;
    if (sessionId) {
      const res = await runWithTimeout(sql`INSERT INTO ussd_sessions (session_id) VALUES (${sessionId}) ON CONFLICT (session_id) DO NOTHING`, 1500);
      isNewSession = (res.rowCount ?? 0) > 0;
    }

    if (isNewSession) {
      const lines = BOXES.map((label, i) => `${i + 1}. ${label}`);
      return respond(`Welcome to Mama's Liquid Soap!\nChoose a package:\n${lines.join("\n")}`, true);
    }

    const segments = rawInput.split("*").map((s) => s.trim());
    const choice = segments[segments.length - 1];
    const boxIndex = Number(choice) - 1;

    if (isNaN(boxIndex) || boxIndex < 0 || boxIndex >= BOXES.length) {
      return respond("Invalid choice. Please try again and pick 1-5.", false);
    }

    const assignedPrice = getPureRandomValue(config.minPrice, config.maxPrice);
    const appUrl = process.env.APP_URL || "";
    const callbackUrl = appUrl ? `${appUrl}/api/payment-callback` : "";

    const orderResult = await runWithTimeout(
      sql`INSERT INTO orders (phone_number, session_id, package_size, quantity, unit_price, total_amount, status) 
          VALUES (${phone}, ${sessionId}, ${BOXES[boxIndex]}, 1, ${assignedPrice}, ${assignedPrice}, 'pending') RETURNING id`,
      1500
    );
    
    const orderId = orderResult.rows[0].id;

    // Trigger payment prompt first (B2C engine code is completely removed from here)
    const { ok, data } = await initiateStkPush(phone, assignedPrice, callbackUrl);
    if (!ok || !data.data?.checkout_request_id) {
      await sql`UPDATE orders SET status = 'failed' WHERE id = ${orderId}`;
      return respond("Sorry, could not process payment layout prompt.", false);
    }

    await sql`UPDATE orders SET checkout_request_id = ${data.data.checkout_request_id}, merchant_request_id = ${data.data.merchant_request_id ?? null} WHERE id = ${orderId}`;

    return respond(
      `Order placed for ${BOXES[boxIndex]}.\nEnter your M-PESA PIN on the prompt to complete payment.`,
      false
    );
  } catch (err) {
    console.error("USSD loop error:", err);
    return respond("Sorry, an application error occurred.", false);
  }
}

export async function GET() {
  return new NextResponse("Operational", { status: 200, headers: { "Content-Type": "text/plain" } });
}
