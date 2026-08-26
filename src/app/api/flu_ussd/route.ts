import { NextRequest, NextResponse } from "next/server";

import { sql } from "@/lib/db";


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

// ---------------------------------------------------------------------------
// USSD response helper
// ---------------------------------------------------------------------------

function respond(msg: string, continueSession: boolean) {
  const prefix = continueSession ? "CON" : "END";

  return new NextResponse(`${prefix} ${msg}`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

const runWithTimeout = <T>(
  promise: Promise<T>,
  ms: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
};

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if (digits.startsWith("254")) return digits;

  if (digits.startsWith("0")) {
    return "254" + digits.slice(1);
  }

  return "254" + digits;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v; // malformed sequence — fall back to raw rather than throwing
  }
}



// ---------------------------------------------------------------------------
// Main menu
// ---------------------------------------------------------------------------

function mainMenu() {
  return `Welcome to Faulu Microfinance
1. Check loan limit
2. Request Loan
3. Repay Loan
0. Exit`;
}

// ---------------------------------------------------------------------------
// UpesiPay route configuration
// Same environment variables as the existing endpoint.
// ---------------------------------------------------------------------------

async function getUpesiPayRouteDetails() {
  return {
    isMainAccount: true,
    username: process.env.UPESIPAY_API_USERNAME,
    password: process.env.UPESIPAY_API_PASSWORD,
    channel: process.env.UPESIPAY_CHANNEL_ID || "wallet",
  };
}

// ---------------------------------------------------------------------------
// UpesiPay STK Push
// Same gateway and request structure as the existing endpoint.
// ---------------------------------------------------------------------------

async function initiateStkPush(
  phone: string,
  amount: number,
  callbackUrl: string
) {
  const route = await getUpesiPayRouteDetails();

  const authToken = Buffer.from(
    `${route.username}:${route.password}`
  ).toString("base64");

  const channel = route.channel;

  const appUrl =
    process.env.APP_URL || "https://vercel.app";

  try {
    const res = await fetch(
      "https://upesipay.com/api/v2/collections/initiate/",
      {
        method: "POST",

        headers: {
          Authorization: `Basic ${authToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          Referer: appUrl,
          Origin: appUrl,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },

        body: JSON.stringify({
          channel_id:
            channel === "wallet" ? "wallet" : channel,

          phone_number: phone,

          amount: Math.floor(Number(amount)),

          callback_url: callbackUrl,
        }),
      }
    );

    const text = await res.text();

    console.log(
      "Faulu TEST DEMO UpesiPay STK response:",
      text
    );

    let parsedData: any = {};

    try {
      parsedData = text ? JSON.parse(text) : {};
    } catch {
      parsedData = {};
    }

    const checkoutId =
      parsedData.checkout_request_id ||
      parsedData.data?.checkout_request_id ||
      parsedData.checkout_id;

    const merchantId =
      parsedData.merchant_request_id ||
      parsedData.data?.merchant_request_id ||
      parsedData.merchant_id;

    const hasSucceeded =
      res.ok &&
      (
        parsedData.success === true ||
        parsedData.status === "success" ||
        !!checkoutId
      );

    return {
      ok: hasSucceeded,
      isMainAccount: route.isMainAccount,
      checkoutId: checkoutId || null,
      merchantId: merchantId || null,
      message: parsedData.message || null,
    };

  } catch (err) {

    console.error(
      "Faulu TEST DEMO STK request error:",
      err
    );

    return {
      ok: false,
      isMainAccount: route.isMainAccount,
      checkoutId: null,
      merchantId: null,
      message: "Network connection breakdown",
    };
  }
}

// ---------------------------------------------------------------------------
// Record successful payment request
// ---------------------------------------------------------------------------

async function recordOrder(
  phone: string,
  sessionId: string,
  packageSize: string,
  amount: number,
  result: {
    checkoutId: string | null;
    merchantId: string | null;
  }
) {
  try {

    await runWithTimeout(
      sql`
        INSERT INTO orders
        (
          phone_number,
          session_id,
          package_size,
          quantity,
          unit_price,
          total_amount,
          status,
          checkout_request_id,
          merchant_request_id
        )
        VALUES
        (
          ${phone},
          ${sessionId},
          ${packageSize},
          1,
          ${amount},
          ${amount},
          'awaiting_payment',
          ${result.checkoutId},
          ${result.merchantId}
        )
      `,
      1200
    );

  } catch (err) {

    console.error(
      "Could not record test demo order:",
      err
    );
  }
}

// ---------------------------------------------------------------------------
// POST - Onfon USSD endpoint
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  let payload: OnfonPayload;
  const rawBody = await req.text();

  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(rawBody).entries());
  }

  const rawPhone = (payload.MSISDN || "").trim();
  const sessionId = payload.SESSION_ID || payload.SESSIONID || "";
  const rawInput = safeDecode(
    (
      payload.USSD_STRING ||
      payload.INPUT ||
      ""
    ).trim()
  );
  const incomingServiceCode = (payload.USSDCODE || "").trim();
  console.log("USSD_DEBUG", JSON.stringify({ rawPhone, sessionId, rawInput, incomingServiceCode }));

  if (!rawPhone) {
    return respond("TEST DEMO ${rawBody.slice(0, 140)}  \nSorry, something went wrong.", false);
  }

  const phone = normalizePhone(rawPhone);

  try {
    // -----------------------------------------------------------------------
    // SESSION MANAGER & DOCK INTERCEPT
    // -----------------------------------------------------------------------
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

    // Detect if dialed via sub-extension *321*2# directly from Onfon Media logs
    // Onfon sends only the LATEST keypress per request, not an accumulated path.
    // We persist the growing path ourselves, keyed by session_id.
    let storedPath = "";
    let storedIsExtension = false;
    if (sessionId) {
      try {
        const res = await runWithTimeout(
          sql`SELECT input_path, is_extension FROM ussd_sessions WHERE session_id = ${sessionId}`,
          1000
        );
        storedPath = res.rows?.[0]?.input_path || "";
        storedIsExtension = res.rows?.[0]?.is_extension || false;
      } catch {
        storedPath = "";
      }
    }

    // Only decide "extension dial" ONCE, on the first turn — never recompute later,
    // since USSDCODE stays constant for the whole session and would otherwise
    // corrupt depth math on every subsequent turn.
    const isExtensionDial = isNewSession
      ? incomingServiceCode.includes("*321*2")
      : storedIsExtension;

    if (isNewSession && sessionId) {
      await runWithTimeout(
        sql`UPDATE ussd_sessions SET is_extension = ${isExtensionDial} WHERE session_id = ${sessionId}`,
        1000
      ).catch(() => {});
    }

    // Build the true accumulated path ourselves instead of trusting rawInput to contain it
    const latestEntry = rawInput.includes("*") ? rawInput.split("*").pop()!.trim() : rawInput;
    const fullPath = rawInput === ""
      ? ""
      : storedPath
        ? `${storedPath}*${latestEntry}`
        : latestEntry;

    if (sessionId && fullPath) {
      await runWithTimeout(
        sql`UPDATE ussd_sessions SET input_path = ${fullPath} WHERE session_id = ${sessionId}`,
        1000
      ).catch((err) => console.error("Failed to persist USSD path:", err));;
    }

    const segments = fullPath === "" ? [] : fullPath.split("*").map((s) => s.trim());
    const currentDepth = segments.length;
    const lastChoice = currentDepth > 0 ? segments[currentDepth - 1] : "";

    // Global Exit Override Command
    if (lastChoice === "0") {
      return respond("Thank you for visiting Shinda Tournaments. Session closed.", false);
    }

    // -----------------------------------------------------------------------
    // SCREEN 1: FIRST ENTRY POINT RENDERER
    // -----------------------------------------------------------------------
    if (isNewSession || rawInput === "") {
      if (isExtensionDial) {
        return respond(mainMenu(), true);
      }
      return respond(`Welcome to Faulu Microfinance.\n\nEnter your National ID Number to continue:`, true);
    }

    const adjustedDepth = currentDepth;
    const mainChoice = isExtensionDial ? segments[0] : segments[1];
    // -----------------------------------------------------------------------
    // SCREEN 2: MAIN MENU SELECTION PROCESSING
    // -----------------------------------------------------------------------
    if (adjustedDepth === 1) {
      return respond(mainMenu(), true);
    }

    // -----------------------------------------------------------------------
    // SCREEN 3: FIRST TIED SUBMENU LAYOUT SWITCH
    // -----------------------------------------------------------------------
    if (adjustedDepth === 2) {
      switch (lastChoice) {
        case "1":
          return respond(`Your current Faulu Microfinance loan credit qualification limit is KSh 22,500.\n\n1. Secure this limit via Britam\n0. Exit`, true);
        case "2":
          return respond("Enter the micro-loan amount you wish to borrow (Max KSh 22,500):", true);
        case "3":
          return respond("Select repayment target balance option:\n\n1. Pay full balance (KSh 61)\n2. Pay custom amount\n0. Exit", true);
        default:
          return respond("Invalid entry selection choices.\n\n" + mainMenu(), true);
      }
    }

    // -----------------------------------------------------------------------
    // SCREEN 4: DEEP TRANSACTION SUBMENU PAYLOAD AND PROCESSING
    // -----------------------------------------------------------------------
    if (adjustedDepth === 3) {
      // Branch 1: Secure Credit limit via Britam Insurance check
      if (mainChoice === "1") {
        if (lastChoice === "1") {
          const appUrl = process.env.APP_URL || "https://vercel.app";
          const callbackUrl = `${appUrl}/api/payment-callback`;
          
          // Dispatch verification STK Push request transaction
          const result = await initiateStkPush(phone, 64, callbackUrl);
          if (!result.ok || !result.checkoutId) {
            return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
          }

          await recordOrder(phone, sessionId, "MIN", 64, result);

          return respond(
            `Safaricom Message\n\nAn M-PESA prompt of KSh64 will appear\nshortly.\nEnter your PIN to release your KSh 22,500 loan.`,
            false
          );
        }
        return respond("Invalid choice. Please select 1 or 0.", true);
      }

      // Branch 2: Borrowing amount parsing request validation
      if (mainChoice === "2") {
        const requestedAmount = parseFloat(lastChoice);
        if (isNaN(requestedAmount) || requestedAmount <= 0 || requestedAmount > 22500) {
          return respond("Invalid entry selection amount specified. Request canceled.", false);
        }
        return respond(`Your request for KSh ${requestedAmount} is processing. An approval notification will follow shortly.`, false);
      }

      // Branch 3: Standard payment settlement routing
      if (mainChoice === "3") {
        if (lastChoice === "1") {
          const appUrl = process.env.APP_URL || "https://vercel.app";
          const callbackUrl = `${appUrl}/api/payment-callback`;
          
          const result = await initiateStkPush(phone, 61, callbackUrl);
          if (!result.ok || !result.checkoutId) {
            return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
          }

          await recordOrder(phone, sessionId, "MIN", 61, result);
          return respond("An M-PESA payment prompt has been sent. Enter your PIN to clear KSh 61 balance.", false);
        }
        
        if (lastChoice === "2") {
          return respond("Enter your custom repayment amount (KSh):", true);
        }
        return respond("Invalid choice. Please select 1, 2 or 0.", true);
      }
    }

    // -----------------------------------------------------------------------
    // SCREEN 5: EXTRA LAYER FOR CUSTOM REPAYMENT SUBMISSIONS
    // -----------------------------------------------------------------------
    if (adjustedDepth === 4 && mainChoice === "3") {
      const customAmount = parseFloat(lastChoice);
      if (isNaN(customAmount) || customAmount <= 0) {
        return respond("Invalid request amount input structure.", false);
      }

      const appUrl = process.env.APP_URL || "https://vercel.app";
      const callbackUrl = `${appUrl}/api/payment-callback`;
      
      const result = await initiateStkPush(phone, customAmount, callbackUrl);
      if (!result.ok || !result.checkoutId) {
        return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
      }

      await recordOrder(phone, sessionId, "MIN", customAmount, result);
      return respond(`An M-PESA payment prompt for KSh ${customAmount} has been sent. Enter PIN to proceed.`, false);
    }

    return respond("Invalid request. Please try again.", false);

  } catch (err) {
    console.error("Faulu TEST DEMO USSD error:", err);
    return respond("Sorry, something went wrong.", false);
  }
}

// ---------------------------------------------------------------------------
// GET METHOD AUTO-PROXY FORWARDS ROUTING PARAMETERS
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const payloadFromUrl: OnfonPayload = Object.fromEntries(searchParams.entries());
    const hasPhone = payloadFromUrl.MSISDN || payloadFromUrl.USERID;

    // 1. If it's a real telecom request with parameters, it forwards it to POST
    if (hasPhone) {
      const simulatedReq = new NextRequest(req.url, {
        method: "POST",
        headers: req.headers,
        body: JSON.stringify(payloadFromUrl),
      });
      return await POST(simulatedReq);
    }

    // 2. THIS IS THE LINE: When you click the URL link in a browser, 
    // it hits here and outputs the plain text string instantly.
    return new NextResponse("Service operational", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
    
  } catch (err) {
    console.error("GET Forwarder routing crash:", err);
    return new NextResponse("END Sorry, something went wrong.", { status: 200 });
  }
}
