
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { checkoutRateLimit } from "@/lib/server/rate-limit";
import { applySpamGuard } from "@/lib/server/spam-guard";

type CheckoutRequestBody = {
  companyWebsite?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Check rate limits & spam rules
  const blockedResponse = await applySpamGuard(request, {
    rateLimit: checkoutRateLimit,
    namespace: "checkout",
  });

  if (blockedResponse) {
    return blockedResponse;
  }

  const body = (await request.json()) as CheckoutRequestBody;

  // 2. Honeypot check: silently accept bot submissions if hidden field is filled
  if (
    typeof body.companyWebsite === "string" &&
    body.companyWebsite.trim().length > 0
  ) {
    return NextResponse.json(
      {
        success: true,
      },
      {
        status: 200,
      },
    );
  }

  // 3. Add your actual checkout/order processing logic here

  return NextResponse.json(
    {
      success: true,
    },
    {
      status: 200,
    },
  );
}
