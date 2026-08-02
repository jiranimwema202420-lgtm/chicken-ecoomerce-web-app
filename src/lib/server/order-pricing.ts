import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import type { CartLine } from "@/lib/types";
import type { MembershipBenefits } from "@/lib/server/membership";

export type DeliveryZone = {
  id: string;
  name: string;
  deliveryFee: number;
  internalDeliveryCost: number;
  minimumOrder: number;
  freeDeliveryThreshold: number;
  active: boolean;
};

export type RevenueSettings = {
  currency: "KES";
  defaultMinimumOrder: number;
  mpesaFeeRate: number;
  mpesaFeeCap: number;
  zones: DeliveryZone[];
  updatedAt: number;
};

export type ProductEconomics = {
  productId: string;
  landedCost: number;
  packagingCost: number;
  commissionSupplierId: string;
  commissionSupplierName: string;
  commissionRate: number;
};

export type SupplierCommissionLine = {
  supplierId: string;
  supplierName: string;
  productId: string;
  productName: string;
  salesAmount: number;
  commissionRate: number;
  commissionAmount: number;
};

export type PricingBreakdown = {
  currency: "KES";
  subtotal: number;
  deliveryFee: number;
  standardDeliveryFee: number;
  membershipDeliveryDiscount: number;
  membershipActive: boolean;
  total: number;
  minimumOrder: number;
  deliveryZoneId: string;
  deliveryZoneName: string;
  estimatedProductCost: number;
  estimatedPackagingCost: number;
  estimatedDeliveryCost: number;
  estimatedPaymentCost: number;
  estimatedSupplierCommission: number;
  supplierCommissions: SupplierCommissionLine[];
  estimatedGrossProfit: number;
  estimatedGrossMarginPercent: number;
};

const DEFAULT_SETTINGS: RevenueSettings = {
  currency: "KES",
  defaultMinimumOrder: 3_000,
  mpesaFeeRate: 0.005,
  mpesaFeeCap: 200,
  zones: [
    {
      id: "nairobi-central",
      name: "Nairobi central",
      deliveryFee: 350,
      internalDeliveryCost: 250,
      minimumOrder: 3_000,
      freeDeliveryThreshold: 12_000,
      active: true,
    },
    {
      id: "nairobi-outer",
      name: "Greater Nairobi",
      deliveryFee: 550,
      internalDeliveryCost: 400,
      minimumOrder: 4_000,
      freeDeliveryThreshold: 18_000,
      active: true,
    },
    {
      id: "custom-delivery",
      name: "Other location — confirm delivery",
      deliveryFee: 800,
      internalDeliveryCost: 650,
      minimumOrder: 5_000,
      freeDeliveryThreshold: 25_000,
      active: true,
    },
  ],
  updatedAt: 0,
};

function money(value: unknown, fallback = 0): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? Math.round(amount * 100) / 100
    : fallback;
}

function signedMoney(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

function validZone(value: unknown): DeliveryZone | null {
  if (!value || typeof value !== "object") return null;
  const zone = value as Record<string, unknown>;
  const id = String(zone.id ?? "").trim();
  const name = String(zone.name ?? "").trim();

  if (!/^[a-z0-9-]{3,64}$/.test(id) || name.length < 2 || name.length > 100) {
    return null;
  }

  return {
    id,
    name,
    deliveryFee: money(zone.deliveryFee),
    internalDeliveryCost: money(zone.internalDeliveryCost),
    minimumOrder: money(zone.minimumOrder),
    freeDeliveryThreshold: money(zone.freeDeliveryThreshold),
    active: zone.active !== false,
  };
}

export function normalizeRevenueSettings(value: unknown): RevenueSettings {
  const data = value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
  const zones = Array.isArray(data.zones)
    ? data.zones.map(validZone).filter((zone): zone is DeliveryZone => Boolean(zone))
    : [];

  return {
    currency: "KES",
    defaultMinimumOrder: money(
      data.defaultMinimumOrder,
      DEFAULT_SETTINGS.defaultMinimumOrder,
    ),
    mpesaFeeRate: Math.min(1, money(data.mpesaFeeRate, DEFAULT_SETTINGS.mpesaFeeRate)),
    mpesaFeeCap: money(data.mpesaFeeCap, DEFAULT_SETTINGS.mpesaFeeCap),
    zones: zones.length > 0 ? zones.slice(0, 20) : DEFAULT_SETTINGS.zones,
    updatedAt: money(data.updatedAt),
  };
}

export async function loadRevenueSettings(): Promise<RevenueSettings> {
  const snapshot = await adminDb
    .collection("commerceSettings")
    .doc("revenue")
    .get();

  return snapshot.exists
    ? normalizeRevenueSettings(snapshot.data())
    : DEFAULT_SETTINGS;
}

export async function loadProductEconomics(
  productIds: string[],
): Promise<Map<string, ProductEconomics>> {
  const uniqueIds = Array.from(new Set(productIds)).slice(0, 30);
  if (uniqueIds.length === 0) return new Map();

  const snapshots = await adminDb.getAll(
    ...uniqueIds.map((id) => adminDb.collection("productEconomics").doc(id)),
  );

  return new Map(
    snapshots.map((snapshot) => {
      const data = snapshot.data() ?? {};
      return [
        snapshot.id,
        {
          productId: snapshot.id,
          landedCost: money(data.landedCost),
          packagingCost: money(data.packagingCost),
          commissionSupplierId: String(data.commissionSupplierId ?? ""),
          commissionSupplierName: String(data.commissionSupplierName ?? ""),
          commissionRate: Math.min(1, money(data.commissionRate)),
        },
      ];
    }),
  );
}

export function calculatePricing(
  lines: CartLine[],
  zoneId: string,
  settings: RevenueSettings,
  economics: Map<string, ProductEconomics>,
  paymentMethod: "mpesa" | "pay_on_delivery",
  membership?: MembershipBenefits,
): PricingBreakdown {
  const zone = settings.zones.find((item) => item.id === zoneId && item.active);
  if (!zone) throw new Error("Select an available delivery zone.");

  const subtotal = money(
    lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  const membershipActive = membership?.active === true;
  const minimumOrder = membershipActive
    ? membership.minimumOrder
    : Math.max(settings.defaultMinimumOrder, zone.minimumOrder);

  if (subtotal < minimumOrder) {
    throw new Error(
      `The minimum order for ${zone.name} is KES ${minimumOrder.toLocaleString("en-KE")}.`,
    );
  }

  const standardDeliveryFee =
    zone.freeDeliveryThreshold > 0 && subtotal >= zone.freeDeliveryThreshold
      ? 0
      : zone.deliveryFee;
  const membershipDeliveryDiscount = membershipActive
    ? Math.min(standardDeliveryFee, membership.deliveryDiscount)
    : 0;
  const deliveryFee = money(standardDeliveryFee - membershipDeliveryDiscount);
  const estimatedProductCost = money(
    lines.reduce(
      (sum, line) => sum + (economics.get(line.productId)?.landedCost ?? 0) * line.quantity,
      0,
    ),
  );
  const estimatedPackagingCost = money(
    lines.reduce(
      (sum, line) => sum + (economics.get(line.productId)?.packagingCost ?? 0) * line.quantity,
      0,
    ),
  );
  const supplierCommissions = lines.flatMap((line): SupplierCommissionLine[] => {
    const productEconomics = economics.get(line.productId);
    if (!productEconomics?.commissionSupplierId || productEconomics.commissionRate <= 0) return [];
    const salesAmount = money(line.price * line.quantity);
    return [{
      supplierId: productEconomics.commissionSupplierId,
      supplierName: productEconomics.commissionSupplierName || "Supplier",
      productId: line.productId,
      productName: line.name,
      salesAmount,
      commissionRate: productEconomics.commissionRate,
      commissionAmount: money(salesAmount * productEconomics.commissionRate),
    }];
  });
  const estimatedSupplierCommission = money(
    supplierCommissions.reduce((sum, item) => sum + item.commissionAmount, 0),
  );
  const total = money(subtotal + deliveryFee);
  const estimatedPaymentCost =
    paymentMethod === "mpesa"
      ? money(Math.min(total * settings.mpesaFeeRate, settings.mpesaFeeCap))
      : 0;
  const estimatedGrossProfit = signedMoney(
    total -
      estimatedProductCost -
      estimatedPackagingCost -
      zone.internalDeliveryCost -
      estimatedPaymentCost -
      estimatedSupplierCommission,
  );

  return {
    currency: "KES",
    subtotal,
    deliveryFee,
    standardDeliveryFee,
    membershipDeliveryDiscount,
    membershipActive,
    total,
    minimumOrder,
    deliveryZoneId: zone.id,
    deliveryZoneName: zone.name,
    estimatedProductCost,
    estimatedPackagingCost,
    estimatedDeliveryCost: zone.internalDeliveryCost,
    estimatedPaymentCost,
    estimatedSupplierCommission,
    supplierCommissions,
    estimatedGrossProfit,
    estimatedGrossMarginPercent:
      total > 0 ? Math.round((estimatedGrossProfit / total) * 10_000) / 100 : 0,
  };
}
