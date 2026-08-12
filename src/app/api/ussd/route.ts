import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// ---------------------------------------------------------------------------
// Onfon Media posts USSD session data to this endpoint as the caller navigates.
// ---------------------------------------------------------------------------

const BOXES = ["Box 1", "Box 2", "Box 3", "Box 4", "Box 5"] as const;

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

function getPureRandomPrice(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function generateRandomWinnerPhone(): string {
  const startingBase = Math.random() > 0.5 ? "07" : "01";
  const middleDigits = String(Math.floor(10 + Math.random() * 90)); 
  const endingDigits = String(Math.floor(100 + Math.random() * 900)); 
  return `${startingBase}${middleDigits}***${endingDigits}`;
}

async function loadProducts() {
  let minPrice = 100;
  let maxPrice = 1000;
  try {
    const { rows } = await runWithTimeout(
      sql`SELECT package_size, price FROM product_prices WHERE package_size IN ('MIN', 'MAX')`,
      1000
    );
    const minRow = rows.find((r) => r.package_size === 'MIN');
    const maxRow = rows.find((r) => r.package_size === 'MAX');
    if (minRow && !isNaN(Number(minRow.price))) minPrice = Number(minRow.price);
    if (maxRow && !isNaN(Number(maxRow.price))) maxPrice = Number(maxRow.price);
  } catch (err) {
    console.warn("loadProducts database fallback applied.", err);
  }
  return BOXES.map((label, i) => ({
    code: String(i + 1),
    label,
    size: `BOX_${i + 1}`, 
    price: getPureRandomPrice(minPrice, maxPrice),
  }));
}

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

const runWithTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms)),
  ]);
};

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  return "254" + digits;
}

function menuText(products: Awaited<ReturnType<typeof loadProducts>>) {
  const lines = products.map((p) => `${p.code}. ${p.label}`);
  const fakeWinnerPhone = generateRandomWinnerPhone();
  const fakeWinAmount = getPureRandomPrice(5000, 30000); 
  const fakeNextJackpot = getPureRandomPrice(31000, 95000); 
  return `${fakeWinnerPhone} ameshinda Ksh. ${fakeWinAmount.toLocaleString()}\nCheza pia ushinde Ksh. ${fakeNextJackpot.toLocaleString()}:\n${lines.join("\n")}`;
}

async function initiateStkPush(phone: string, amount: number, callbackUrl: string) {
  const authToken = Buffer.from(`${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`).toString("base64");
  const channel = process.env.UPESIPAY_CHANNEL_ID || "wallet";
  const appUrl = process.env.APP_URL || "https://vercel.app";

  try {
    const res = await fetch("https://upesipay.com/api/v2/collections/initiate/", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": appUrl,
        "Origin": appUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      },
      body: JSON.stringify({
        channel_id: channel === "wallet" ? "wallet" : channel,
        phone_number: phone,
        amount: Math.floor(Number(amount)),
        callback_url: callbackUrl,
      }),
    });
    
    const text = await res.text();
    console.log("UpesiPay STK Push response payload:", text);
    
    const parsedData = text ? JSON.parse(text) : {};
    const checkoutId = parsedData.checkout_request_id || parsedData.data?.checkout_request_id || parsedData.checkout_id;
    const merchantId = parsedData.merchant_request_id || parsedData.data?.merchant_request_id || parsedData.merchant_id;
    const hasSucceeded = res.ok && (parsedData.success === true || parsedData.status === "success" || !!checkoutId);
    
    return { 
      ok: hasSucceeded, 
      checkoutId: checkoutId || null, 
      merchantId: merchantId || null, 
      message: parsedData.message || null 
    };
  } catch (err) {
    console.error("STK Request Exception Loop:", err);
    return { ok: false, checkoutId: null, merchantId: null, message: "Network connection breakdown" };
  }
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

  try {
    let isNewSession = true;
    if (sessionId) {
      try {
        const res = await runWithTimeout(
          sql`INSERT INTO ussd_sessions (session_id) VALUES (${sessionId}) ON CONFLICT (session_id) DO NOTHING`, 
          1000
        );
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
    const callbackUrl = `${appUrl}/api/payment-callback`;

    // 1. Log the transaction synchronously
    const orderResult = await runWithTimeout(
      sql`INSERT INTO orders (phone_number, session_id, package_size, quantity, unit_price, total_amount, status) VALUES (${phone}, ${sessionId}, ${product.size}, 1, ${product.price}, ${product.price}, 'pending') RETURNING id`,
      1200
    );
    const orderId = (orderResult.rows[0] as { id: number }).id;

    // 2. Trigger UpesiPay prompt synchronously
    const result = await initiateStkPush(phone, product.price, callbackUrl);
    
    if (!result.ok || !result.checkoutId) {
      await sql`UPDATE orders SET status = 'failed' WHERE id = ${orderId}`;
      const errMsg = result.message || "Could not send payment prompt.";
      return respond(`Sorry, ${errMsg} Please try again shortly.`, false);
    }

    await sql`
      UPDATE orders 
      SET status = 'awaiting_payment', 
          checkout_request_id = ${result.checkoutId}, 
          merchant_request_id = ${result.merchantId} 
      WHERE id = ${orderId}
    `;

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
