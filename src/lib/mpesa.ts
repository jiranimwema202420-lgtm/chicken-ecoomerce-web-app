import axios from "axios";

const BASE_URL =
  process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

interface DarajaErrorBody {
  requestId?: string;
  errorCode?: string;
  errorMessage?: string;
  error_description?: string;
  ResponseCode?: string;
  ResponseDescription?: string;
  CustomerMessage?: string;
  message?: string;
}

interface StkPushParams {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
}

/**
 * Converts an Axios/Daraja failure into a readable error.
 *
 * Sensitive values such as the access token, passkey, consumer secret,
 * generated password, and Authorization header are intentionally not logged.
 */
function throwDarajaError(stage: string, error: unknown): never {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error(`Unknown error during Daraja ${stage}`);
  }

  const status = error.response?.status;
  const responseData = error.response?.data as
    | DarajaErrorBody
    | string
    | undefined;

  /*
   * This prints Safaricom's response body in the server terminal.
   * It does not print your Authorization header or secret credentials.
   */
  console.error(`Daraja ${stage} failed:`, {
    status,
    url: error.config?.url,
    method: error.config?.method,
    data: responseData,
  });

  let darajaMessage = "";

  if (typeof responseData === "string") {
    darajaMessage = responseData;
  } else if (responseData && typeof responseData === "object") {
    darajaMessage =
      responseData.errorMessage ??
      responseData.error_description ??
      responseData.ResponseDescription ??
      responseData.CustomerMessage ??
      responseData.message ??
      "";
  }

  const message =
    darajaMessage.trim() ||
    `Daraja ${stage} failed with HTTP status ${status ?? "unknown"}`;

  throw new Error(message);
}

/**
 * Fetches a short-lived OAuth access token from Safaricom.
 */
export async function getMpesaAccessToken(): Promise<string> {
  const consumerKey = requireEnv("MPESA_CONSUMER_KEY");
  const consumerSecret = requireEnv("MPESA_CONSUMER_SECRET");

  const credentials = Buffer.from(
    `${consumerKey}:${consumerSecret}`,
    "utf8",
  ).toString("base64");

  try {
    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
        timeout: 15_000,
      },
    );

    const accessToken = response.data?.access_token;

    if (typeof accessToken !== "string" || accessToken.trim().length === 0) {
      throw new Error("Safaricom did not return an OAuth access token.");
    }

    return accessToken;
  } catch (error) {
    throwDarajaError("OAuth", error);
  }
}

/**
 * Produces the timestamp format required by Daraja:
 * YYYYMMDDHHmmss
 */
function timestampNow(): string {
  const date = new Date();

  const pad = (value: number) => String(value).padStart(2, "0");

  return (
    String(date.getFullYear()) +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Normalizes Kenyan phone numbers to:
 * 2547XXXXXXXX or 2541XXXXXXXX
 */
export function normalizeMsisdn(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("254")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `254${digits.slice(1)}`;
  }

  if (digits.startsWith("7") || digits.startsWith("1")) {
    return `254${digits}`;
  }

  return digits;
}

export function isValidKenyanMobile(phone: string): boolean {
  return /^254(?:7\d{8}|1\d{8})$/.test(normalizeMsisdn(phone));
}

/**
 * Sends an M-Pesa Express/STK Push request.
 */
export async function initiateStkPush({
  phone,
  amount,
  accountReference,
  transactionDesc,
}: StkPushParams): Promise<StkPushResponse> {
  const accessToken = await getMpesaAccessToken();

  const shortcode = requireEnv("MPESA_SHORTCODE");
  const passkey = requireEnv("MPESA_PASSKEY");
  const callbackUrl = requireEnv("MPESA_CALLBACK_URL");

  const normalizedPhone = normalizeMsisdn(phone);
  const timestamp = timestampNow();

  const password = Buffer.from(
    `${shortcode}${passkey}${timestamp}`,
    "utf8",
  ).toString("base64");

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.ceil(amount),
    PartyA: normalizedPhone,
    PartyB: shortcode,
    PhoneNumber: normalizedPhone,
    CallBackURL: callbackUrl,
    AccountReference: accountReference.slice(0, 12),
    TransactionDesc: transactionDesc.slice(0, 13),
  };

  /*
   * Safe diagnostic information.
   *
   * Do not log the generated Password, access token,
   * passkey, consumer key, or consumer secret.
   */
  console.log("Sending Daraja STK Push:", {
    environment:
      process.env.MPESA_ENV === "production" ? "production" : "sandbox",
    baseUrl: BASE_URL,
    shortcode,
    amount: payload.Amount,
    phone: normalizedPhone,
    callbackUrl,
    accountReference: payload.AccountReference,
    transactionType: payload.TransactionType,
  });

  try {
    const response = await axios.post<StkPushResponse>(
      `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 20_000,
      },
    );

    return response.data;
  } catch (error) {
    throwDarajaError("STK Push", error);
  }
}




