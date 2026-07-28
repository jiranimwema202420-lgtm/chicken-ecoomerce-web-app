"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  BadgeDollarSign,
  Download,
  FileText,
  Mail,
  Phone,
  ReceiptText,
  RefreshCw,
  Search,
  ShoppingBag,
  Tags,
  UserRound,
  UsersRound,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  openSalesDocument,
  type SalesDocumentTransaction,
} from "@/lib/sales-documents";

type CustomerStatus = "active" | "vip" | "watch" | "inactive";
type CustomerFilter =
  | "all"
  | "paying"
  | "repeat"
  | "vip"
  | "guest"
  | "offline"
  | "inactive";

interface Customer {
  id: string;
  profileId: string;
  userId: string | null;
  source: string[];
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
  transactionCount: number;
  paidTransactionCount: number;
  pendingTransactionCount: number;
  failedTransactionCount: number;
  lifetimeValue: number;
  averageOrderValue: number;
  totalItems: number;
  firstOrderAt: number | null;
  lastOrderAt: number | null;
  transactions: SalesDocumentTransaction[];
}

const moneyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatDate(value: number | null): string {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function csvCell(value: unknown): string {
  const text = String(value ?? "");

  if (!/[",\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

function statusClass(status: CustomerStatus): string {
  if (status === "vip") return "bg-violet-100 text-violet-700";
  if (status === "watch") return "bg-amber-100 text-amber-700";
  if (status === "inactive") return "bg-slate-100 text-slate-600";
  return "bg-emerald-100 text-emerald-700";
}

function orderStatusClass(status: string): string {
  if (status === "paid" || status === "fulfilled") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (status === "pending_payment") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-red-100 text-red-700";
}

export default function CustomerTracker() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [statusDraft, setStatusDraft] =
    useState<CustomerStatus>("active");
  const [tagsDraft, setTagsDraft] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadCustomers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(
        "/api/admin/customers"
      );
      const data = (await response.json()) as {
        customers?: Customer[];
        generatedAt?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Customer information could not be loaded."
        );
      }

      const nextCustomers = data.customers ?? [];
      setCustomers(nextCustomers);
      setGeneratedAt(data.generatedAt ?? Date.now());
      setSelectedCustomerId((current) => {
        if (
          current &&
          nextCustomers.some((customer) => customer.id === current)
        ) {
          return current;
        }

        return nextCustomers[0]?.id ?? "";
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Customer information could not be loaded."
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();

    const intervalId = window.setInterval(() => {
      void loadCustomers(true);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, [loadCustomers]);

  const selectedCustomer = useMemo(
    () =>
      customers.find(
        (customer) => customer.id === selectedCustomerId
      ) ?? null,
    [customers, selectedCustomerId]
  );

  useEffect(() => {
    if (!selectedCustomer) return;

    setNameDraft(selectedCustomer.name);
    setEmailDraft(selectedCustomer.email);
    setPhoneDraft(selectedCustomer.phone);
    setStatusDraft(selectedCustomer.customerStatus);
    setTagsDraft(selectedCustomer.tags.join(", "));
    setNotesDraft(selectedCustomer.notes);
    setMessage("");
    setError("");
  }, [selectedCustomer]);

  const visibleCustomers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesSearch =
        !normalizedSearch ||
        customer.name.toLowerCase().includes(normalizedSearch) ||
        customer.email.toLowerCase().includes(normalizedSearch) ||
        customer.phone.toLowerCase().includes(normalizedSearch) ||
        customer.tags.some((tag) =>
          tag.toLowerCase().includes(normalizedSearch)
        );

      if (!matchesSearch) return false;

      if (filter === "paying") {
        return customer.paidTransactionCount > 0;
      }
      if (filter === "repeat") {
        return customer.paidTransactionCount > 1;
      }
      if (filter === "vip") {
        return customer.customerStatus === "vip";
      }
      if (filter === "guest") return customer.isGuest;
      if (filter === "offline") {
        return customer.source.includes("offline_sales");
      }
      if (filter === "inactive") {
        return customer.customerStatus === "inactive";
      }

      return true;
    });
  }, [customers, filter, search]);

  const metrics = useMemo(() => {
    const payingCustomers = customers.filter(
      (customer) => customer.paidTransactionCount > 0
    );
    const lifetimeRevenue = customers.reduce(
      (sum, customer) => sum + customer.lifetimeValue,
      0
    );
    const repeatCustomers = customers.filter(
      (customer) => customer.paidTransactionCount > 1
    ).length;

    return {
      totalCustomers: customers.length,
      payingCustomers: payingCustomers.length,
      repeatCustomers,
      lifetimeRevenue,
      averageCustomerValue:
        payingCustomers.length > 0
          ? lifetimeRevenue / payingCustomers.length
          : 0,
    };
  }, [customers]);

  async function saveCustomerProfile() {
    if (!selectedCustomer) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const tags = tagsDraft
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const response = await authenticatedFetch(
        "/api/admin/customers",
        {
          method: "PATCH",
          body: JSON.stringify({
            profileId: selectedCustomer.profileId,
            name: nameDraft,
            email: emailDraft,
            phone: phoneDraft,
            customerStatus: statusDraft,
            tags,
            notes: notesDraft,
          }),
        }
      );
      const data = (await response.json()) as {
        profile?: unknown;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Customer profile could not be saved."
        );
      }

      setCustomers((current) =>
        current.map((customer) =>
          customer.id === selectedCustomer.id
            ? {
                ...customer,
                name: nameDraft.trim() || customer.name,
                email: emailDraft.trim().toLowerCase(),
                phone: phoneDraft.trim(),
                customerStatus: statusDraft,
                tags,
                notes: notesDraft.trim(),
              }
            : customer
        )
      );
      setMessage("Customer profile saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Customer profile could not be saved."
      );
    } finally {
      setSaving(false);
    }
  }

  function createDocument(
    kind: "invoice" | "receipt",
    transaction: SalesDocumentTransaction
  ) {
    if (!selectedCustomer) return;

    setError("");
    setMessage("");

    try {
      openSalesDocument(kind, transaction, {
        name: selectedCustomer.name,
        email: selectedCustomer.email,
        phone: selectedCustomer.phone,
      });
    } catch (documentError) {
      setError(
        documentError instanceof Error
          ? documentError.message
          : "The sales document could not be created."
      );
    }
  }

  function exportCustomers() {
    const rows = [
      [
        "Customer",
        "Email",
        "Phone",
        "Status",
        "Tags",
        "Orders",
        "Paid orders",
        "Lifetime value (KES)",
        "Average order value (KES)",
        "Items purchased",
        "First order",
        "Last order",
      ],
      ...visibleCustomers.map((customer) => [
        customer.name,
        customer.email,
        customer.phone,
        customer.customerStatus,
        customer.tags.join("; "),
        customer.transactionCount,
        customer.paidTransactionCount,
        customer.lifetimeValue,
        Math.round(customer.averageOrderValue),
        customer.totalItems,
        customer.firstOrderAt
          ? formatDate(customer.firstOrderAt)
          : "",
        customer.lastOrderAt
          ? formatDate(customer.lastOrderAt)
          : "",
      ]),
    ];

    const csv = rows
      .map((row) => row.map(csvCell).join(","))
      .join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `duka-customers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const metricCards = [
    {
      label: "Customer records",
      value: metrics.totalCustomers.toLocaleString("en-KE"),
      icon: UsersRound,
    },
    {
      label: "Paying customers",
      value: metrics.payingCustomers.toLocaleString("en-KE"),
      icon: ShoppingBag,
    },
    {
      label: "Repeat customers",
      value: metrics.repeatCustomers.toLocaleString("en-KE"),
      icon: UserRound,
    },
    {
      label: "Customer revenue",
      value: moneyFormatter.format(metrics.lifetimeRevenue),
      icon: BadgeDollarSign,
    },
    {
      label: "Average customer value",
      value: moneyFormatter.format(metrics.averageCustomerValue),
      icon: BadgeDollarSign,
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Customer intelligence</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Customers
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            Track registered, guest, and off-app customers, review
            complete sales history, maintain internal notes, and create
            printable invoices and payment receipts.
          </p>
          <p className="mt-1 text-xs text-ink/45">
            {generatedAt
              ? `Last synchronized ${formatDate(generatedAt)}`
              : "Customer information has not synchronized yet."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-secondary gap-2"
            disabled={loading}
            onClick={() => void loadCustomers()}
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            className="btn-secondary gap-2"
            disabled={visibleCustomers.length === 0}
            onClick={exportCustomers}
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/55">
                {label}
              </p>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-bold">
              {loading ? "..." : value}
            </p>
          </div>
        ))}
      </div>

      {(error || message) && (
        <p
          className={`mt-5 rounded-md border p-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role="status"
        >
          {error || message}
        </p>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[390px_1fr]">
        <section className="card h-fit overflow-hidden xl:sticky xl:top-24">
          <div className="space-y-3 border-b border-line p-4">
            <label className="relative block">
              <span className="sr-only">Search customers</span>
              <Search
                size={17}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
              />
              <input
                type="search"
                className="input-field pl-10"
                placeholder="Search name, email, phone, tag..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <select
              className="input-field"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as CustomerFilter)
              }
              aria-label="Filter customers"
            >
              <option value="all">All customers</option>
              <option value="paying">Paying customers</option>
              <option value="repeat">Repeat customers</option>
              <option value="vip">VIP customers</option>
              <option value="guest">Guest customers</option>
              <option value="offline">Off-app customers</option>
              <option value="inactive">Inactive customers</option>
            </select>
          </div>

          <div className="max-h-[720px] divide-y divide-line overflow-y-auto">
            {loading ? (
              <p className="p-8 text-center text-sm text-ink/55">
                Loading customers...
              </p>
            ) : visibleCustomers.length === 0 ? (
              <p className="p-8 text-center text-sm text-ink/55">
                No customers match this search.
              </p>
            ) : (
              visibleCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className={`w-full p-4 text-left transition ${
                    selectedCustomerId === customer.id
                      ? "bg-forest/10"
                      : "hover:bg-canvas/70"
                  }`}
                  onClick={() =>
                    setSelectedCustomerId(customer.id)
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {customer.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-ink/50">
                        {customer.email ||
                          customer.phone ||
                          "No contact information"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusClass(
                        customer.customerStatus
                      )}`}
                    >
                      {titleCase(customer.customerStatus)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="text-ink/50">
                      {customer.paidTransactionCount} paid order
                      {customer.paidTransactionCount === 1 ? "" : "s"}
                    </span>
                    <span className="font-bold text-forest">
                      {moneyFormatter.format(customer.lifetimeValue)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        {!selectedCustomer ? (
          <section className="card grid min-h-96 place-items-center p-8 text-center">
            <div>
              <UsersRound
                size={38}
                className="mx-auto text-ink/25"
              />
              <h2 className="mt-4 font-display text-xl font-bold">
                Select a customer
              </h2>
              <p className="mt-2 text-sm text-ink/55">
                Choose a record to review customer data and sales
                history.
              </p>
            </div>
          </section>
        ) : (
          <div className="space-y-6">
            <section className="card p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl font-bold">
                      {selectedCustomer.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                        selectedCustomer.customerStatus
                      )}`}
                    >
                      {titleCase(selectedCustomer.customerStatus)}
                    </span>
                    {selectedCustomer.isGuest && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                        Guest
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-ink/55">
                    Sources:{" "}
                    {selectedCustomer.source
                      .map(titleCase)
                      .join(", ")}
                  </p>
                </div>

                <div className="text-sm sm:text-right">
                  <p className="text-ink/50">Lifetime value</p>
                  <p className="font-display text-2xl font-bold text-forest">
                    {moneyFormatter.format(
                      selectedCustomer.lifetimeValue
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  {
                    label: "Transactions",
                    value: selectedCustomer.transactionCount,
                  },
                  {
                    label: "Paid orders",
                    value: selectedCustomer.paidTransactionCount,
                  },
                  {
                    label: "Items purchased",
                    value: selectedCustomer.totalItems,
                  },
                  {
                    label: "Average order",
                    value: moneyFormatter.format(
                      selectedCustomer.averageOrderValue
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-md border border-line bg-canvas/50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
                      {item.label}
                    </p>
                    <p className="mt-2 font-display text-xl font-bold">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail
                    size={17}
                    className="mt-0.5 text-forest"
                  />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="mt-1 text-ink/55">
                      {selectedCustomer.email || "Not recorded"}
                    </p>
                    {selectedCustomer.email && (
                      <p className="mt-1 text-xs text-ink/40">
                        {selectedCustomer.emailVerified
                          ? "Firebase email verified"
                          : "Email not verified"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone
                    size={17}
                    className="mt-0.5 text-forest"
                  />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <p className="mt-1 text-ink/55">
                      {selectedCustomer.phone || "Not recorded"}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="font-semibold">First order</p>
                  <p className="mt-1 text-ink/55">
                    {formatDate(selectedCustomer.firstOrderAt)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Last order</p>
                  <p className="mt-1 text-ink/55">
                    {formatDate(selectedCustomer.lastOrderAt)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Account created</p>
                  <p className="mt-1 text-ink/55">
                    {formatDate(selectedCustomer.authCreatedAt)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold">Last sign-in</p>
                  <p className="mt-1 text-ink/55">
                    {formatDate(selectedCustomer.lastSignInAt)}
                  </p>
                </div>
              </div>
            </section>

            <section className="card p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Tags size={19} className="text-forest" />
                <h3 className="font-display text-xl font-bold">
                  Customer profile and notes
                </h3>
              </div>
              <p className="mt-2 text-sm text-ink/55">
                These administrative fields are stored separately and do
                not overwrite the customer&apos;s Firebase Authentication
                account.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="customer-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Display name
                  </label>
                  <input
                    id="customer-name"
                    className="input-field"
                    value={nameDraft}
                    onChange={(event) =>
                      setNameDraft(event.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-status"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Customer status
                  </label>
                  <select
                    id="customer-status"
                    className="input-field"
                    value={statusDraft}
                    onChange={(event) =>
                      setStatusDraft(
                        event.target.value as CustomerStatus
                      )
                    }
                  >
                    <option value="active">Active</option>
                    <option value="vip">VIP</option>
                    <option value="watch">Watch</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="customer-email"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Tracking email
                  </label>
                  <input
                    id="customer-email"
                    type="email"
                    className="input-field"
                    value={emailDraft}
                    onChange={(event) =>
                      setEmailDraft(event.target.value)
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="customer-phone"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Tracking phone
                  </label>
                  <input
                    id="customer-phone"
                    className="input-field"
                    value={phoneDraft}
                    onChange={(event) =>
                      setPhoneDraft(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="customer-tags"
                  className="mb-2 block text-sm font-semibold"
                >
                  Tags
                </label>
                <input
                  id="customer-tags"
                  className="input-field"
                  value={tagsDraft}
                  onChange={(event) =>
                    setTagsDraft(event.target.value)
                  }
                  placeholder="wholesale, repeat buyer, Nairobi"
                />
                <p className="mt-2 text-xs text-ink/45">
                  Separate tags with commas.
                </p>
              </div>

              <div className="mt-4">
                <label
                  htmlFor="customer-notes"
                  className="mb-2 block text-sm font-semibold"
                >
                  Internal notes
                </label>
                <textarea
                  id="customer-notes"
                  className="input-field min-h-32"
                  value={notesDraft}
                  onChange={(event) =>
                    setNotesDraft(event.target.value)
                  }
                  placeholder="Delivery preferences, support history, account notes..."
                />
              </div>

              <button
                type="button"
                className="btn-primary mt-5"
                disabled={saving}
                onClick={() => void saveCustomerProfile()}
              >
                {saving ? "Saving..." : "Save customer profile"}
              </button>
            </section>

            <section className="card overflow-hidden">
              <div className="border-b border-line px-5 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={19} className="text-forest" />
                  <h3 className="font-display text-xl font-bold">
                    Complete sales history
                  </h3>
                </div>
                <p className="mt-2 text-sm text-ink/55">
                  Online cart orders and linked off-app sales are shown
                  together.
                </p>
              </div>

              {selectedCustomer.transactions.length === 0 ? (
                <p className="px-6 py-12 text-center text-sm text-ink/55">
                  This customer has no recorded sales.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1120px] text-left text-sm">
                    <thead className="bg-canvas/80 text-xs uppercase tracking-wide text-ink/50">
                      <tr>
                        <th className="px-4 py-3">Reference</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Channel</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">
                          Total
                        </th>
                        <th className="px-4 py-3">Payment</th>
                        <th className="px-4 py-3">Documents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {selectedCustomer.transactions.map(
                        (transaction) => (
                          <tr key={`${transaction.source}:${transaction.id}`}>
                            <td className="px-4 py-4 font-semibold">
                              {transaction.documentNumber}
                            </td>
                            <td className="px-4 py-4 text-xs text-ink/55">
                              {formatDate(transaction.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                              {titleCase(transaction.channel)}
                            </td>
                            <td className="max-w-72 px-4 py-4 text-xs leading-5 text-ink/60">
                              {transaction.lines
                                .map(
                                  (line) =>
                                    `${line.quantity} Ãƒâ€” ${line.name}`
                                )
                                .join(", ")}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-bold ${orderStatusClass(
                                  transaction.status
                                )}`}
                              >
                                {titleCase(transaction.status)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-forest">
                              {moneyFormatter.format(transaction.total)}
                            </td>
                            <td className="px-4 py-4 text-xs leading-5 text-ink/55">
                              <p>
                                {titleCase(
                                  transaction.paymentMethod ||
                                    "payment"
                                )}
                              </p>
                              <p>
                                {transaction.paymentReference ||
                                  "No reference"}
                              </p>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="btn-secondary min-h-9 gap-1.5 px-3 py-2 text-xs"
                                  onClick={() =>
                                    createDocument(
                                      "invoice",
                                      transaction
                                    )
                                  }
                                >
                                  <FileText size={14} />
                                  Invoice
                                </button>
                                <button
                                  type="button"
                                  className="btn-secondary min-h-9 gap-1.5 px-3 py-2 text-xs"
                                  disabled={
                                    ![
                                      "paid",
                                      "fulfilled",
                                    ].includes(transaction.status)
                                  }
                                  onClick={() =>
                                    createDocument(
                                      "receipt",
                                      transaction
                                    )
                                  }
                                >
                                  <ReceiptText size={14} />
                                  Receipt
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}