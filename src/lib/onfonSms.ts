// Sends transactional SMS via Onfon Media's Bulk SMS API.
// Docs: https://www.docs.onfonmedia.co.ke/rest/sms/

type OnfonSmsResponse = {
  ErrorCode?: number;
  ErrorDescription?: string;
  Data?: { MobileNumber?: string; MessageId?: string }[];
  [key: string]: unknown;
};

export async function sendSms(phone: string, text: string) {
  const apiKey = process.env.ONFON_SMS_API_KEY || "";
  const clientId = process.env.ONFON_SMS_CLIENT_ID || "";
  const senderId = process.env.ONFON_SMS_SENDER_ID || "";

  try {
    const res = await fetch("https://api.onfonmedia.co.ke/v1/sms/SendBulkSMS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        AccessKey: apiKey,
      },
      body: JSON.stringify({
        SenderId: senderId,
        MessageParameters: [{ Number: phone, Text: text }],
        ApiKey: apiKey,
        ClientId: clientId,
      }),
    });

    const rawText = await res.text();
    let data: OnfonSmsResponse;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { ErrorDescription: `Non-JSON response (status ${res.status})` };
    }

    const ok = res.ok && data.ErrorCode === 0;
    if (!ok) {
      console.error("Onfon SMS send failed:", { phone, data });
    }
    return { ok, data };
  } catch (err) {
    console.error("Onfon SMS request threw:", err);
    return { ok: false, data: null };
  }
}

/** "3L" -> "3 Litre" — matches the wording used in the USSD menu. */
export function packageLabel(packageSize: string): string {
  return `${packageSize.replace("L", "")} Litre`;
}
