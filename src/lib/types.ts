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
  mpesaCheckoutRequestId?: string;
  mpesaReceiptNumber?: string;
  createdAt: number;
  updatedAt: number;
}
