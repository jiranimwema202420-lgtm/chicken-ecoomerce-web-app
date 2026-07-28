import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { UserRecord } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";

export const runtime = "nodejs";

const CUSTOMER_STATUSES = [
  "active",
  "vip",
  "watch",
  "inactive",
] as const;

type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

interface CustomerLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface CustomerTransaction {
  id: string;
  source: "online" | "offline";
  channel: "online" | "offline";
  documentNumber: string;
  status: string;
  lines: CustomerLine[];
  total: number;
  phone: string;
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  paymentReference: string;
  createdAt: number;
  paidAt: number | null;
  updatedAt: number;
}

interface CustomerProfileRecord {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  tags?: string[];
  status?: CustomerStatus;
  updatedAt?: number;
  updatedBy?: string;
}

interface CustomerDraft {
  id: string;
  profileId: string;
  userId: string | null;
  source: Set<string>;
  name: string;
  email: string;
  phone: string;
  isGuest: boolean;
  disabled: boolean;
  emailVerified: boolean;
  providerIds: string[];
  authCreatedAt: number | null;
  lastSignInAt: number | null;
  notes: string;
  tags: string[];
  customerStatus: CustomerStatus;
  transactions: CustomerTransaction[];
}

function cleanString(value: unknown, maximum = 500): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function normalizeEmail(value: unknown): string {
  return cleanString(value, 320).toLowerCase();
}

function normalizePhone(value: unknown): string {
  return cleanString(value, 40).replace(/[^\d+]/g, "");
}

function parseTimestamp(value: unknown): number {
  const numeric = Number(value);

  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric;
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function profileIdForKey(key: string): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 40);
}

function transactionNumber(
  source: "online" | "offline",
  id: string,
  createdAt: number
): string {
  const date = new Date(createdAt || Date.now())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const prefix = source === "online" ? "ORD" : "OFF";

  return `${prefix}-${date}-${id.slice(0, 8).toUpperCase()}`;
}

function safeLines(value: unknown): CustomerLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, 100)
    .map((rawLine) => {
      const line =
        rawLine && typeof rawLine === "object"
          ? (rawLine as Record<string, unknown>)
          : {};

      return {
        productId: cleanString(line.productId, 128),
        name: cleanString(line.name, 160) || "Product",
        price: Math.max(0, Number(line.price ?? 0)),
        quantity: Math.max(
          0,
          Math.trunc(Number(line.quantity ?? 0))
        ),
      };
    })
    .filter((line) => line.quantity > 0);
}

async function listAllUsers(): Promise<UserRecord[]> {
  const users: UserRecord[] = [];
  let pageToken: string | undefined;

  do {
    const page = await adminAuth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
}

export async function GET(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const [
      users,
      ordersSnapshot,
      offlineSalesSnapshot,
      profilesSnapshot,
    ] = await Promise.all([
      listAllUsers(),
      adminDb.collection("orders").get(),
      adminDb.collection("offlineSales").get(),
      adminDb.collection("customerProfiles").get(),
    ]);

    const profiles = new Map<string, CustomerProfileRecord>(
      profilesSnapshot.docs.map((document) => [
        document.id,
        document.data() as CustomerProfileRecord,
      ])
    );
    const customers = new Map<string, CustomerDraft>();
    const emailIndex = new Map<string, string>();
    const phoneIndex = new Map<string, string>();

    function getOrCreate(
      key: string,
      seed: Partial<Omit<CustomerDraft, "source">> & {
        source?: Iterable<string>;
      } = {}
    ): CustomerDraft {
      const existing = customers.get(key);

      if (existing) return existing;

      const profileId = profileIdForKey(key);
      const profile = profiles.get(profileId);

      const customer: CustomerDraft = {
        id: key,
        profileId,
        userId: seed.userId ?? null,
        source: new Set(seed.source ?? []),
        name:
          cleanString(profile?.name, 160) ||
          cleanString(seed.name, 160) ||
          "Customer",
        email:
          normalizeEmail(profile?.email) ||
          normalizeEmail(seed.email),
        phone:
          normalizePhone(profile?.phone) ||
          normalizePhone(seed.phone),
        isGuest: Boolean(seed.isGuest),
        disabled: Boolean(seed.disabled),
        emailVerified: Boolean(seed.emailVerified),
        providerIds: Array.isArray(seed.providerIds)
          ? seed.providerIds
          : [],
        authCreatedAt: seed.authCreatedAt ?? null,
        lastSignInAt: seed.lastSignInAt ?? null,
        notes: cleanString(profile?.notes, 5000),
        tags: Array.isArray(profile?.tags)
          ? profile.tags
              .map((tag) => cleanString(tag, 40))
              .filter(Boolean)
              .slice(0, 10)
          : [],
        customerStatus: CUSTOMER_STATUSES.includes(
          profile?.status as CustomerStatus
        )
          ? (profile?.status as CustomerStatus)
          : "active",
        transactions: [],
      };

      customers.set(key, customer);

      if (customer.email) emailIndex.set(customer.email, key);
      if (customer.phone) phoneIndex.set(customer.phone, key);

      return customer;
    }

    function resolveCustomerKey(input: {
      userId?: unknown;
      email?: unknown;
      phone?: unknown;
      name?: unknown;
      fallbackId: string;
    }): string {
      const userId = cleanString(input.userId, 128);
      const email = normalizeEmail(input.email);
      const phone = normalizePhone(input.phone);
      const name = cleanString(input.name, 160).toLowerCase();

      if (userId && customers.has(`user:${userId}`)) {
        return `user:${userId}`;
      }

      if (email && emailIndex.has(email)) {
        return emailIndex.get(email) as string;
      }

      if (phone && phoneIndex.has(phone)) {
        return phoneIndex.get(phone) as string;
      }

      if (userId) return `user:${userId}`;
      if (email) return `email:${email}`;
      if (phone) return `phone:${phone}`;
      if (name) return `name:${name}`;

      return `transaction:${input.fallbackId}`;
    }

    for (const user of users) {
      const key = `user:${user.uid}`;
      const providerIds = user.providerData
        .map((provider) => provider.providerId)
        .filter(Boolean);
      const customer = getOrCreate(key, {
        userId: user.uid,
        source: ["firebase_auth"],
        name: user.displayName ?? "",
        email: user.email ?? "",
        phone: user.phoneNumber ?? "",
        isGuest: providerIds.includes("anonymous"),
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        providerIds,
        authCreatedAt: parseTimestamp(
          user.metadata.creationTime
        ),
        lastSignInAt: parseTimestamp(
          user.metadata.lastSignInTime
        ),
      });

      customer.source.add("firebase_auth");

      if (customer.email) emailIndex.set(customer.email, key);
      if (customer.phone) phoneIndex.set(customer.phone, key);
    }

    for (const document of ordersSnapshot.docs) {
      const data = document.data();
      const createdAt = parseTimestamp(data.createdAt);
      const key = resolveCustomerKey({
        userId: data.userId,
        email: data.customerEmail,
        phone: data.phone,
        name: data.customerName,
        fallbackId: document.id,
      });
      const customer = getOrCreate(key, {
        userId: cleanString(data.userId, 128) || null,
        source: ["online_orders"],
        name: cleanString(data.customerName, 160),
        email: normalizeEmail(data.customerEmail),
        phone: normalizePhone(data.phone),
        isGuest: Boolean(data.isGuest),
      });

      customer.source.add("online_orders");

      if (
        customer.name === "Customer" &&
        cleanString(data.customerName, 160)
      ) {
        customer.name = cleanString(data.customerName, 160);
      }
      if (!customer.email) {
        customer.email = normalizeEmail(data.customerEmail);
      }
      if (!customer.phone) {
        customer.phone = normalizePhone(data.phone);
      }

      customer.transactions.push({
        id: document.id,
        source: "online",
        channel: "online",
        documentNumber: transactionNumber(
          "online",
          document.id,
          createdAt
        ),
        status: cleanString(
          data.status,
          60
        ) || "pending_payment",
        lines: safeLines(data.lines),
        total: Math.max(0, Number(data.total ?? 0)),
        phone: normalizePhone(data.phone),
        customerName:
          cleanString(data.customerName, 160) ||
          customer.name,
        customerEmail:
          normalizeEmail(data.customerEmail) ||
          customer.email,
        paymentMethod:
          cleanString(data.paymentMethod, 60) || "mpesa",
        paymentReference:
          cleanString(data.mpesaReceiptNumber, 120) ||
          cleanString(data.paymentReference, 120),
        createdAt,
        paidAt:
          parseTimestamp(data.paidAt) ||
          parseTimestamp(data.updatedAt) ||
          null,
        updatedAt: parseTimestamp(data.updatedAt),
      });
    }

    for (const document of offlineSalesSnapshot.docs) {
      const data = document.data();
      const createdAt = parseTimestamp(data.createdAt);
      const email = normalizeEmail(data.customerEmail);
      const phone = normalizePhone(data.customerPhone);
      const name =
        cleanString(data.customerName, 160) || "Walk-in customer";
      const key = resolveCustomerKey({
        email,
        phone,
        name,
        fallbackId: document.id,
      });
      const customer = getOrCreate(key, {
        source: ["offline_sales"],
        name,
        email,
        phone,
      });

      customer.source.add("offline_sales");

      if (customer.name === "Customer") customer.name = name;
      if (!customer.email) customer.email = email;
      if (!customer.phone) customer.phone = phone;

      customer.transactions.push({
        id: document.id,
        source: "offline",
        channel: "offline",
        documentNumber:
          cleanString(data.saleNumber, 120) ||
          transactionNumber("offline", document.id, createdAt),
        status: "paid",
        lines: [
          {
            productId: cleanString(data.productId, 128),
            name:
              cleanString(data.productName, 160) || "Product",
            price: Math.max(0, Number(data.unitPrice ?? 0)),
            quantity: Math.max(
              0,
              Math.trunc(Number(data.quantity ?? 0))
            ),
          },
        ].filter((line) => line.quantity > 0),
        total: Math.max(0, Number(data.total ?? 0)),
        phone,
        customerName: name,
        customerEmail: email,
        paymentMethod:
          cleanString(data.paymentMethod, 60) || "other",
        paymentReference: cleanString(
          data.paymentReference,
          120
        ),
        createdAt,
        paidAt: createdAt || null,
        updatedAt: parseTimestamp(data.updatedAt) || createdAt,
      });
    }

    const result = Array.from(customers.values())
      .map((customer) => {
        const transactions = customer.transactions.sort(
          (left, right) => right.createdAt - left.createdAt
        );
        const paidTransactions = transactions.filter(
          (transaction) =>
            transaction.status === "paid" ||
            transaction.status === "fulfilled"
        );
        const lifetimeValue = paidTransactions.reduce(
          (sum, transaction) => sum + transaction.total,
          0
        );
        const totalItems = paidTransactions.reduce(
          (sum, transaction) =>
            sum +
            transaction.lines.reduce(
              (lineSum, line) => lineSum + line.quantity,
              0
            ),
          0
        );
        const firstOrderAt =
          transactions.length > 0
            ? transactions[transactions.length - 1].createdAt
            : null;
        const lastOrderAt =
          transactions.length > 0
            ? transactions[0].createdAt
            : null;

        return {
          id: customer.id,
          profileId: customer.profileId,
          userId: customer.userId,
          source: Array.from(customer.source),
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          isGuest: customer.isGuest,
          disabled: customer.disabled,
          emailVerified: customer.emailVerified,
          providerIds: customer.providerIds,
          authCreatedAt: customer.authCreatedAt,
          lastSignInAt: customer.lastSignInAt,
          notes: customer.notes,
          tags: customer.tags,
          customerStatus: customer.customerStatus,
          transactionCount: transactions.length,
          paidTransactionCount: paidTransactions.length,
          pendingTransactionCount: transactions.filter(
            (transaction) =>
              transaction.status === "pending_payment"
          ).length,
          failedTransactionCount: transactions.filter(
            (transaction) =>
              transaction.status === "failed" ||
              transaction.status === "cancelled"
          ).length,
          lifetimeValue,
          averageOrderValue:
            paidTransactions.length > 0
              ? lifetimeValue / paidTransactions.length
              : 0,
          totalItems,
          firstOrderAt,
          lastOrderAt,
          transactions,
        };
      })
      .sort((left, right) => {
        if (right.lifetimeValue !== left.lifetimeValue) {
          return right.lifetimeValue - left.lifetimeValue;
        }

        return (right.lastOrderAt ?? 0) - (left.lastOrderAt ?? 0);
      });

    return NextResponse.json({
      customers: result,
      generatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Customer tracking load failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Customer information could not be loaded.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<
      string,
      unknown
    >;
    const profileId = cleanString(body.profileId, 80);
    const name = cleanString(body.name, 160);
    const email = normalizeEmail(body.email);
    const phone = normalizePhone(body.phone);
    const notes = cleanString(body.notes, 5000);
    const status = cleanString(
      body.customerStatus,
      20
    ) as CustomerStatus;
    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((tag) => cleanString(tag, 40))
          .filter(Boolean)
          .filter(
            (tag, index, values) =>
              values.indexOf(tag) === index
          )
          .slice(0, 10)
      : [];

    if (
      !/^[a-f0-9]{40}$/.test(profileId) ||
      !CUSTOMER_STATUSES.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid customer profile update." },
        { status: 400 }
      );
    }

    const profile = {
      name,
      email,
      phone,
      notes,
      tags,
      status,
      updatedAt: Date.now(),
      updatedBy: admin.uid,
    };

    await adminDb
      .collection("customerProfiles")
      .doc(profileId)
      .set(profile, { merge: true });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Customer profile update failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Customer profile could not be saved.",
      },
      { status: 500 }
    );
  }
}