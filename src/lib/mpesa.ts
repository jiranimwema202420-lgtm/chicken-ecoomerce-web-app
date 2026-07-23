import axios from "axios";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

/** Fetches a short-lived OAuth access token from Safaricom. */
export async function getMpesaAccessToken(): Promise<string> {
  const key = requireEnv("MPESA_CONSUMER_KEY");
  const secret = requireEnv("MPESA_CONSUMER_SECRET");
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const { data } = await axios.get(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      timeout: 15_000,
    }
  );

  if (!data?.access_token) {
    throw new Error("Safaricom did not return an access token");
  }

  return data.access_token as string;
}

function timestampNow(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/** Normalizes Kenyan mobile numbers to 2547xxxxxxxx or 2541xxxxxxxx. */
export function normalizeMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) return `254${digits}`;
  return digits;
}

export function isValidKenyanMobile(phone: string): boolean {
  return /^254(?:7\d{8}|1\d{8})$/.test(normalizeMsisdn(phone));
}

interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

/** Initiates an STK Push prompt on the customer's phone. */
export async function initiateStkPush({
  phone,
  amount,
  accountReference,
  transactionDesc,
}: StkPushParams) {
  const accessToken = await getMpesaAccessToken();
  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");
  const timestamp = timestampNow();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
    "base64"
  );

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount),
    PartyA: normalizeMsisdn(phone),
    PartyB: shortcode,
    PhoneNumber: normalizeMsisdn(phone),
    CallBackURL: callbackUrl,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13),
  };

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    payload,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 20_000,
    }
  );

  return data as {
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    CustomerMessage: string;
  };
}
