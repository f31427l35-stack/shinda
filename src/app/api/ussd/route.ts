import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions"; // 👈 CRITICAL IMPORT FOR SERVERLESS BACKGROUND RUNS
import { sql } from "@/lib/db";

// ... [Keep BOXES, OnfonPayload type, getPureRandomPrice, generateRandomWinnerPhone, loadProducts, respond, runWithTimeout, normalizePhone, menuText, initiateStkPush, loadSystemConfig, and processOrderInBackground EXACTLY as they are right now] ...

export async function POST(req: NextRequest) {
  let payload: OnfonPayload;
  const rawBody = await req.text();
  try { payload = JSON.parse(rawBody); } catch { payload = Object.fromEntries(new URLSearchParams(rawBody).entries()); }

  const rawPhone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSION_ID || payload.SESSIONID || "";
  const rawInput = (payload.USSD_STRING || payload.INPUT || "").trim();

  if (!rawPhone) return respond("Sorry, something went wrong.", false);
  const phone = normalizePhone(rawPhone);

  try {
    let isNewSession = true;
    if (sessionId) {
      try {
        const res = await runWithTimeout(sql`INSERT INTO ussd_sessions (session_id) VALUES (${sessionId}) ON CONFLICT (session_id) DO NOTHING`, 1000);
        isNewSession = (res.rowCount ?? 0) > 0;
      } catch {
        isNewSession = true;
      }
    }

    if (isNewSession) {
      const products = await loadProducts();
      return respond(menuText(products), true);
    }

    const segments = rawInput.split("*").map((s) => s.trim());
    const choice = segments[segments.length - 1];

    const products = await loadProducts();
    const product = products.find((p) => p.code === choice);

    if (!product) return respond("Invalid choice. Pick 1-5.", false);

    const appUrl = process.env.APP_URL || "https://vercel.app";

    // 🔥 FIXED: Wrap the unawaited background function inside waitUntil()
    // This tells Vercel: "Send the response text to the phone NOW, but keep the server running for a few seconds to trigger UpesiPay!"
    waitUntil(
      processOrderInBackground(phone, sessionId, { size: product.size, price: product.price }, appUrl)
    );

    // 🚀 Sent back instantly to your phone screen!
    return respond(
      `You chose Box ${product.code}.\nEnter your M-PESA PIN to see what the box has in store for you.`,
      false
    );
  } catch (err) {
    console.error("USSD error loop handler catch:", err);
    return respond("Sorry, something went wrong.", false);
  }
}

export async function GET() {
  return new NextResponse("Service operational", { status: 200, headers: { "Content-Type": "text/plain" } });
}
