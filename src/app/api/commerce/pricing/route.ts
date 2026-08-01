import { NextResponse } from "next/server";

import { loadRevenueSettings } from "@/lib/server/order-pricing";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await loadRevenueSettings();
    return NextResponse.json(
      {
        currency: settings.currency,
        defaultMinimumOrder: settings.defaultMinimumOrder,
        zones: settings.zones
          .filter((zone) => zone.active)
          .map((zone) => ({
            id: zone.id,
            name: zone.name,
            deliveryFee: zone.deliveryFee,
            minimumOrder: zone.minimumOrder,
            freeDeliveryThreshold: zone.freeDeliveryThreshold,
            active: zone.active,
          })),
      },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch (error) {
    console.error("Public pricing configuration failed:", error);
    return NextResponse.json(
      { error: "Delivery pricing is temporarily unavailable." },
      { status: 503 },
    );
  }
}
