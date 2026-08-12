// Sends money OUT to a customer's M-Pesa number via UpesiPay's wallet
// withdrawal endpoint — the B2C counterpart to the STK push collection
// used in src/app/api/ussd/route.ts.
// Docs: https://upesipay.com/docs/post-payments-wallet-withdraw-to-mobile

type UpesiPayWithdrawalResponse = {
  success?: boolean;
  message?: string;
  data?: {
    withdrawal_id?: string;
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export async function initiateWithdrawal(phone: string, amount: number) {
  const authToken = Buffer.from(
    `${process.env.UPESIPAY_API_USERNAME}:${process.env.UPESIPAY_API_PASSWORD}`
  ).toString("base64");

  const res = await fetch("https://upesipay.com/api/v2/withdrawals/initiate/", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number: phone,
      amount,
      processing_type: "default",
    }),
  });

  const rawText = await res.text();
  let data: UpesiPayWithdrawalResponse;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    console.error("UpesiPay withdrawal returned a non-JSON response:", {
      status: res.status,
      rawText: rawText.slice(0, 300),
    });
    data = { message: `Payment provider returned an unexpected response (status ${res.status}).` };
  }

  return { ok: res.ok && data.success === true, data };
}
