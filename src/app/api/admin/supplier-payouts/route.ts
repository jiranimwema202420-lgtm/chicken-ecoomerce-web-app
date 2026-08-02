import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import { loadAccruedSupplierCommissions } from "@/lib/server/supplier-payouts";

export const dynamic = "force-dynamic";
const money = (value: unknown) => { const amount = Number(value); return Number.isFinite(amount) && amount > 0 && amount <= 10_000_000 ? Math.round(amount * 100) / 100 : null; };
export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request); if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const [suppliers, payouts, accrued] = await Promise.all([adminDb.collection("suppliers").limit(200).get(), adminDb.collection("supplierPayouts").orderBy("createdAt", "desc").limit(500).get(), loadAccruedSupplierCommissions()]);
  const paid = new Map<string, number>();
  const payoutItems = payouts.docs.map((doc) => { const data = doc.data(); const amount = Number(data.amount ?? 0); if (data.status === "paid") paid.set(String(data.supplierId), (paid.get(String(data.supplierId)) ?? 0) + amount); return { id: doc.id, supplierId: String(data.supplierId), supplierName: String(data.supplierName ?? "Supplier"), amount, method: String(data.method ?? "mpesa"), reference: String(data.reference ?? ""), status: String(data.status ?? "paid"), createdAt: Number(data.createdAt ?? 0) }; });
  const balances = suppliers.docs.map((doc) => { const accruedAmount = accrued.get(doc.id) ?? 0; const paidAmount = paid.get(doc.id) ?? 0; return { supplierId: doc.id, supplierName: String(doc.data().businessName ?? "Supplier"), accrued: accruedAmount, paid: paidAmount, outstanding: Math.max(0, Math.round((accruedAmount - paidAmount) * 100) / 100) }; }).filter((item) => item.accrued > 0 || item.paid > 0);
  return NextResponse.json({ balances, payouts: payoutItems, summary: { accrued: balances.reduce((sum, item) => sum + item.accrued, 0), paid: balances.reduce((sum, item) => sum + item.paid, 0), outstanding: balances.reduce((sum, item) => sum + item.outstanding, 0) } });
}
export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request); if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>; const supplierId = String(body.supplierId ?? ""); const amount = money(body.amount); const method = String(body.method ?? "mpesa"); const reference = String(body.reference ?? "").trim().toUpperCase().slice(0, 80); const notes = String(body.notes ?? "").trim().slice(0, 500);
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(supplierId) || amount === null || !["mpesa", "bank"].includes(method) || !/^[A-Z0-9_-]{6,80}$/.test(reference)) return NextResponse.json({ error: "Enter a valid supplier, payout amount, method, and reference." }, { status: 400 });
  const [supplier, accruedMap] = await Promise.all([adminDb.collection("suppliers").doc(supplierId).get(), loadAccruedSupplierCommissions()]); if (!supplier.exists) return NextResponse.json({ error: "Supplier not found." }, { status: 404 });
  const accrued = accruedMap.get(supplierId) ?? 0; const payoutRef = adminDb.collection("supplierPayouts").doc(); const ledgerRef = adminDb.collection("supplierPayoutLedgers").doc(supplierId); const referenceRef = adminDb.collection("supplierPayoutReferences").doc(createHash("sha256").update(reference).digest("hex"));
  const result = await adminDb.runTransaction(async (transaction) => { const [ledger, existingReference] = await Promise.all([transaction.get(ledgerRef), transaction.get(referenceRef)]); if (existingReference.exists) return "duplicate"; const paidTotal = Number(ledger.data()?.paidTotal ?? 0); if (amount > Math.round((accrued - paidTotal) * 100) / 100) return "overpayment"; const now = Date.now(); transaction.set(payoutRef, { supplierId, supplierName: String(supplier.data()?.businessName ?? "Supplier"), amount, currency: "KES", method, reference, notes, status: "paid", createdAt: now, createdBy: admin.uid }); transaction.set(referenceRef, { payoutId: payoutRef.id, createdAt: now }); transaction.set(ledgerRef, { supplierId, paidTotal: Math.round((paidTotal + amount) * 100) / 100, updatedAt: now }, { merge: true }); return "paid"; });
  if (result === "duplicate") return NextResponse.json({ error: "This payout reference already exists." }, { status: 409 }); if (result === "overpayment") return NextResponse.json({ error: "The payout exceeds the supplier's outstanding commission." }, { status: 409 }); return NextResponse.json({ success: true, payoutId: payoutRef.id }, { status: 201 });
}
