import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ---------------------------------------------------------------------------
// Onfon Media posts USSD session data to this endpoint as the caller navigates.
// ---------------------------------------------------------------------------

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
  SESSION_ID?: string;
  SESSIONID?: string;
  USSD_STRING?: string;
  INPUT?: string;
  NEWREQUEST?: string;
  USSDCODE?: string;
};

/**
 * FIXED: Returns plain text with CON/END syntax as strictly expected by Onfon Media.
 * Also appends anti-caching headers to bypass Vercel Edge caching rules.
 */
function respond(msg: string, continueSession: boolean) {
  const prefix = continueSession ? "CON" : "END";
  
  return new NextResponse(`${prefix} ${msg}`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}

/**
 * UTILITY: Forces asynchronous processes to reject if they take longer than the ms threshold,
 * preventing Safaricom/Onfon 3-second network gateway drops.
 */
const runWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database execution timeout")), ms)
    ),
  ]);
};

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
  
  const res = await fetch("https://upesipay.com", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      //  FIXED
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

  console.log("USSD raw payload received:", { parsedAs, payload });

  const rawPhone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSION_ID || payload.SESSIONID || "";
  const rawInput = (payload.USSD_STRING || payload.INPUT || "").trim();

  if (!rawPhone) {
    console.log("USSD: No MSISDN field identified. Dropping session execution.");
    return respond("Sorry, something went wrong. Please try again.", false);
  }

  const phone = normalizePhone(rawPhone);

  try {
    let isNewSession = true;

    if (sessionId) {
      try {
        // Enforce a strict 1.5-second runtime limit on database pool check-in.
        const res = await runWithTimeout(
          sql`INSERT INTO ussd_sessions (session_id) VALUES (${sessionId}) ON CONFLICT (session_id) DO NOTHING`,
          1500
        );
        isNewSession = (res.rowCount ?? 0) > 0;
      } catch (dbErr) {
        console.warn("Database execution timed out; defaulting to menu safety fallback.", dbErr);
        isNewSession = true; 
      }
    }

    // Screen 1: Render product size matrix options
    if (isNewSession) {
      return respond(menuText(), true);
    }

    // Screen 2: Track options routing context logic
    const segments = rawInput.split("*").map((s) => s.trim());
    const choice = segments[segments.length - 1];
    const product = PRODUCTS.find((p) => p.code === choice);

    if (!product) {
      return respond("Invalid choice. Please try again and pick 1-5.", false);
    }

    const quantity = 1;
    const totalAmount = product.price * quantity;
    const appUrl = process.env.APP_URL || "";
    const callbackUrl = appUrl ? `${appUrl}/api/payment-callback` : "";

    // Log the order into database with a safe timeout mechanism
    const orderResult = await runWithTimeout(
      sql`INSERT INTO orders (phone_number, session_id, package_size, quantity, unit_price, total_amount, status) 
          VALUES (${phone}, ${sessionId}, ${product.size}, ${quantity}, ${product.price}, ${totalAmount}, 'pending') 
          RETURNING id`,
      1500
    );
    
    const orderId = orderResult.rows[0].id;

    // Trigger payment aggregator pipeline wrapper
    const { ok, data } = await initiateStkPush(phone, totalAmount, callbackUrl);

    if (!ok) {
      await sql`UPDATE orders SET status = 'failed' WHERE id = ${orderId}`;
      const errMsg = data?.message || "Could not send payment prompt.";
      return respond(`Sorry, ${errMsg} Please try again shortly.`, false);
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
      false
    );

  } catch (err) {
    console.error("USSD webhook processing lifecycle error:", err);
    return respond("Sorry, something went wrong. Please try again shortly.", false);
  }
}

export async function GET() {
  return new NextResponse("Service status operational", {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}
