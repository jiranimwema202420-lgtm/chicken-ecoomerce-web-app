import { after, NextResponse, type NextRequest } from "next/server";

import { runOpportunisticInventoryCleanup } from "@/lib/server/inventory-monitoring";
import { checkoutRateLimit } from "@/lib/server/rate-limit";
import { applySpamGuard } from "@/lib/server/spam-guard";

type CheckoutRequestBody = {
  companyWebsite?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const blockedResponse = await applySpamGuard(request, {
    rateLimit: checkoutRateLimit,
    namespace: "checkout",
  });

  if (blockedResponse) {
    return blockedResponse;
  }

  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid checkout request.",
      },
      {
        status: 400,
      },
    );
  }

  // Silently accept bot submissions caught by the honeypot.
  if (
    typeof body.companyWebsite === "string" &&
    body.companyWebsite.trim().length > 0
  ) {
    return NextResponse.json({ success: true });
  }

  // Run expired-reservation cleanup after the response is sent.
  after(async () => {
    const result = await runOpportunisticInventoryCleanup(
      "system:checkout",
      "checkout",
    );

    if (result.status === "failed") {
      console.error("Checkout inventory cleanup failed", {
        message: result.message,
        trigger: result.trigger,
      });
    }
  });

  // Keep your existing checkout/order-processing logic here.
  return NextResponse.json(
    {
      success: true,
    },
    {
      status: 200,
    },
  );
}
