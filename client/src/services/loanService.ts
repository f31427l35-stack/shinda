import { LoanCategoryInfo, LoanCategoryType, DisbursementReceipt, StkPushRequest, StkPushResponse } from "@/types/loan";

export const LOAN_CATEGORIES: Record<LoanCategoryType, LoanCategoryInfo> = {
  salary: {
    id: "salary",
    name: "Salary Loan",
    badge: "Lowest Rate",
    principal: 38500,
    repayment: 39400,
    interest: 900,
    tenure: "30 Days",
    description: "Designed for employed individuals with regular monthly income. Lowest processing rate."
  },
  biashara: {
    id: "biashara",
    name: "Biashara Loan",
    badge: "Most Popular",
    principal: 38500,
    repayment: 39900,
    interest: 1400,
    tenure: "45 Days",
    description: "Working capital for business owners, traders, and entrepreneurs with flexible repayment."
  },
  emergency: {
    id: "emergency",
    name: "Emergency Loan",
    badge: "Instant Release",
    principal: 38500,
    repayment: 40900,
    interest: 2400,
    tenure: "60 Days",
    description: "Instant 24/7 disbursement for medical, school fees, or urgent unexpected expenses."
  }
};

/**
 * Deterministic fee and amount calculator derived from user's phone number seed (as in the USSD codebase)
 */
export function calculateDynamicLoanValues(phone: string) {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const last3 = cleanPhone.slice(-3);
  const phoneSeed = parseFloat(last3) || 5;

  // Exact USSD formula: Math.floor(400 + phoneSeed % 401) => Range 400 - 800 KSh (typically 465)
  const seededFee = Math.floor(400 + (phoneSeed % 401));
  const securityFee = seededFee === 400 ? 465 : seededFee; // standard baseline is 465

  const defaultRepay = 465;
  const multiplierLoan = defaultRepay * 4; // 4x multiplier = 1,860 or 4,000 based on 1000

  return {
    qualifyLimit: 38500,
    crbScore: 504,
    crbStatus: "Risky Loan" as const,
    approvedSecuredLoan: 22500,
    securityFee: securityFee,
    seededRepayment: seededFee,
    multiplierLoan: multiplierLoan,
    partner: "Britam Insurance Kenya"
  };
}

/**
 * Format currency with KSh prefix
 */
export function formatKsh(amount: number): string {
  return `KSh ${amount.toLocaleString("en-KE")}`;
}

/**
 * Generates simulated transaction ID
 */
export function generateMpesaCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "Q";
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Local storage key for saving transactions
 */
const STORAGE_KEY = "faulu_loan_records";

export function saveDisbursementRecord(record: DisbursementReceipt) {
  try {
    const existing = getDisbursementRecords();
    existing.unshift(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch (err) {
    console.error("Failed to save record:", err);
  }
}

export function getDisbursementRecords(): DisbursementReceipt[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

/**
 * Mock STK Push request / Real checkout endpoint fallback
 */

export async function initiateWebCheckout(
  req: StkPushRequest
): Promise<StkPushResponse> {
  try {
    const response = await fetch("/api/web-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        localId: "",
        checkoutRequestId: "",
        merchantRequestId: "",
        responseCode: String(
          data.responseCode || response.status
        ),
        responseDescription:
          data.message ||
          data.error ||
          "Unable to start M-Pesa payment.",
        customerMessage:
          data.message ||
          "Unable to start the M-Pesa payment request.",
        timestamp: new Date().toISOString(),
      };
    }

    return data;
  } catch (error) {
    console.error(
      "Web checkout request failed:",
      error
    );

    return {
      success: false,
      localId: "",
      checkoutRequestId: "",
      merchantRequestId: "",
      responseCode: "NETWORK_ERROR",
      responseDescription:
        "Could not connect to the payment service.",
      customerMessage:
        "Could not connect to the payment service. Please try again.",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * USSD Response Engine replicating the exact server USSD logic
 */
export function executeUssdStep(rawInput: string, phone: string = "0712345678"): { response: string; isContinued: boolean } {
  const segments = rawInput === "" ? [] : rawInput.split("*").map((s) => s.trim());
  const currentDepth = segments.length;
  const lastChoice = currentDepth > 0 ? segments[currentDepth - 1] : "";

  // Exit
  if (lastChoice === "0") {
    return {
      response: "Thank you for visiting Faulu Microfinance. Session closed.",
      isContinued: false
    };
  }

  // Initial screen (no input or single star)
  if (rawInput === "" || currentDepth === 0) {
    return {
      response: `Welcome to Faulu Microfinance.\nEnter your National ID Number to continue:`,
      isContinued: true
    };
  }

  // Depth 1: User just entered National ID -> Show Main Menu
  if (currentDepth === 1) {
    return {
      response: `Welcome to Faulu Microfinance\n1. Check Fast Loan Limit (KSh 38,500)\n2. Request Loan / Categories\n3. Repay Loan / 4x Multiplier\n0. Exit`,
      isContinued: true
    };
  }

  const mainChoice = segments[1];

  // Depth 2: User picked 1, 2, or 3 from Main Menu
  if (currentDepth === 2) {
    switch (lastChoice) {
      case "1":
        return {
          response: `Congratulations!\nYou qualify for a KSh 38,500 loan.\nFast, safe & flexible disbursement.\n\n1. Continue\n0. Back`,
          isContinued: true
        };
      case "2":
        return {
          response: `Select Loan Category:\n1. Salary Loan (Repay 39,400)\n2. Biashara Loan (Repay 39,900)\n3. Emergency Loan (Repay 40,900)\n0. Back`,
          isContinued: true
        };
      case "3": {
        const phoneSeed = parseFloat(phone.slice(-3)) || 5;
        const seededRepayment = Math.floor(400 + (phoneSeed % 401));
        return {
          response: `Faulu 4x Limit Booster:\nRepay KSh ${seededRepayment}/month & qualify for a 4x loan (KSh ${seededRepayment * 4}) after 1 month.\n\n1. Pay KSh ${seededRepayment} via M-PESA\n2. Pay Full Balance (KSh 61)\n0. Back`,
          isContinued: true
        };
      }
      default:
        return {
          response: `Invalid selection.\n\n1. Check Fast Loan Limit\n2. Request Loan\n3. Repay Loan\n0. Exit`,
          isContinued: true
        };
    }
  }

  // Depth 3:
  if (currentDepth === 3) {
    if (mainChoice === "1") {
      if (lastChoice === "1") {
        const phoneSeed = parseFloat(phone.slice(-3)) || 5;
        const seededFee = Math.floor(400 + (phoneSeed % 401));
        return {
          response: `⚠️ CRB Assessment Warning\nYour CRB score is 504 (Risky Loan).\nWe partner with Britam to guarantee and secure this allocation.\nApproved Loan: KSh 22,500\nBritam Security Fee: KSh ${seededFee}\n\n1. Release Loan via M-Pesa (Pay KSh ${seededFee})\n0. Cancel`,
          isContinued: true
        };
      }
    }

    if (mainChoice === "2") {
      let catName = "";
      let repay = "";
      let int = "";
      if (lastChoice === "1") { catName = "Salary Loan"; repay = "39,400"; int = "900"; }
      else if (lastChoice === "2") { catName = "Biashara Loan"; repay = "39,900"; int = "1,400"; }
      else if (lastChoice === "3") { catName = "Emergency Loan"; repay = "40,900"; int = "2,400"; }

      if (catName) {
        return {
          response: `${catName}: KSh 38,500\nRepay KSh ${repay} (Interest KSh ${int})\nPrincipal limit verified.\n\n1. Continue to CRB Approval\n0. Back`,
          isContinued: true
        };
      }
    }

    if (mainChoice === "3") {
      if (lastChoice === "1" || lastChoice === "2") {
        const amt = lastChoice === "1" ? (Math.floor(400 + ((parseFloat(phone.slice(-3)) || 5) % 401))) : 61;
        return {
          response: `An M-PESA payment prompt of KSh ${amt} will appear shortly on your phone.\nEnter your PIN to complete repayment & boost limit.`,
          isContinued: false
        };
      }
    }
  }

  // Depth 4:
  if (currentDepth === 4) {
    if (mainChoice === "1" && lastChoice === "1") {
      const seededFee = Math.floor(400 + ((parseFloat(phone.slice(-3)) || 5) % 401));
      return {
        response: `An M-PESA STK prompt of KSh ${seededFee} has been sent to ${phone}.\nEnter PIN to complete loan security fee & instantly receive KSh 22,500 in your M-Pesa.`,
        isContinued: false
      };
    }
    if (mainChoice === "2" && lastChoice === "1") {
      const seededFee = Math.floor(400 + ((parseFloat(phone.slice(-3)) || 5) % 401));
      return {
        response: `⚠️ CRB Assessment Warning: Score 504 (Risky Loan).\nBritam Guaranteed Loan: KSh 22,500 Approved.\nLoan Security Fee: KSh ${seededFee}.\n\n1. Release to M-Pesa\n0. Cancel`,
        isContinued: true
      };
    }
  }

  // Depth 5:
  if (currentDepth === 5 && mainChoice === "2" && lastChoice === "1") {
    const seededFee = Math.floor(400 + ((parseFloat(phone.slice(-3)) || 5) % 401));
    return {
      response: `An M-PESA STK prompt of KSh ${seededFee} has been sent to ${phone}.\nEnter PIN to authorize Britam security fee & release KSh 22,500.`,
      isContinued: false
    };
  }

  return {
    response: "Thank you for using Faulu Microfinance services.",
    isContinued: false
  };
}
