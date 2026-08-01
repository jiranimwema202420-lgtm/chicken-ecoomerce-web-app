export interface Product {
  id: string;
  name: string;
  description: string;
  price: number; // KES
  imageUrl: string;
  category: string;
  stock: number;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CartLine {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  maxQuantity?: number;
}


export type PaymentMethod = "mpesa" | "pay_on_delivery";

export type DeliveryStatus =
  | "pending"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "fulfilled";

export interface Order {
  id: string;
  userId: string;
  customerEmail?: string | null;
  customerName?: string | null;
  isGuest?: boolean;
  lines: CartLine[];
  total: number;
  phone: string;
  status: OrderStatus;
  paymentMethod?: PaymentMethod;
  paymentStatus?: "unpaid" | "paid" | "cancelled";
  deliveryStatus?: DeliveryStatus;
  deliveryName?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  deliveryZoneId?: string;
  deliveryZoneName?: string;
  pricingBreakdown?: {
    currency: "KES";
    subtotal: number;
    deliveryFee: number;
    total: number;
    minimumOrder: number;
    estimatedProductCost: number;
    estimatedPackagingCost: number;
    estimatedDeliveryCost: number;
    estimatedPaymentCost: number;
    estimatedGrossProfit: number;
    estimatedGrossMarginPercent: number;
  };
  paymentReference?: string | null;
  mpesaCheckoutRequestId?: string;
  mpesaReceiptNumber?: string;
  createdAt: number;
  updatedAt: number;
}

export type SupplyRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "received";

export interface SupplierProfile {
  id: string;
  uid: string;
  manual?: boolean;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  productIds: string[];
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SupplyRequest {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  expectedDeliveryDate: string;
  notes: string;
  status: SupplyRequestStatus;
  reviewedBy?: string | null;
  reviewedAt?: number | null;
  receivedAt?: number | null;
  createdAt: number;
  updatedAt: number;
}
