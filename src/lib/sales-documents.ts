"use client";

export interface SalesDocumentLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface SalesDocumentTransaction {
  id: string;
  source: "online" | "offline";
  channel: "online" | "offline";
  documentNumber: string;
  status: string;
  lines: SalesDocumentLine[];
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

export interface SalesDocumentCustomer {
  name: string;
  email: string;
  phone: string;
}

export type SalesDocumentKind = "invoice" | "receipt";

const PREVIEW_ID = "duka-sales-document-preview";
const MAX_DOCUMENT_LINES = 100;

function safeText(value: unknown, maximum = 500): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function escapeHtml(value: unknown): string {
  return safeText(value, 2_000)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function finiteNumber(value: unknown, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function formatMoney(value: unknown): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(Math.max(0, finiteNumber(value)));
}

function formatDate(value: unknown): string {
  const timestamp = finiteNumber(value);

  if (timestamp <= 0) return "Not recorded";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Not recorded";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function titleCase(value: unknown): string {
  return safeText(value, 120)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedLines(
  transaction: SalesDocumentTransaction
): SalesDocumentLine[] {
  if (!Array.isArray(transaction.lines)) return [];

  return transaction.lines
    .slice(0, MAX_DOCUMENT_LINES)
    .map((line, index) => ({
      productId: safeText(
        line?.productId || `line-${index + 1}`,
        128
      ),
      name: safeText(line?.name || "Product", 240),
      price: Math.max(0, finiteNumber(line?.price)),
      quantity: Math.max(
        1,
        Math.trunc(finiteNumber(line?.quantity, 1))
      ),
    }));
}

function closeExistingPreview(): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(PREVIEW_ID);

  if (!(existing instanceof HTMLElement)) return;

  const previousOverflow = existing.dataset.previousBodyOverflow ?? "";
  document.body.style.overflow = previousOverflow;
  existing.remove();
}

function buildDocumentHtml(
  kind: SalesDocumentKind,
  transaction: SalesDocumentTransaction,
  customer: SalesDocumentCustomer
): {
  html: string;
  documentId: string;
} {
  const lines = normalizedLines(transaction);

  if (lines.length === 0) {
    throw new Error(
      "This transaction has no product lines to include in the document."
    );
  }

  const storeName =
    safeText(process.env.NEXT_PUBLIC_STORE_NAME, 120) || "Duka";
  const storePhone = safeText(
    process.env.NEXT_PUBLIC_STORE_PHONE,
    80
  );
  const storeEmail = safeText(
    process.env.NEXT_PUBLIC_STORE_EMAIL,
    160
  );
  const storeAddress =
    safeText(process.env.NEXT_PUBLIC_STORE_ADDRESS, 300) ||
    "Kenya";

  const documentPrefix = kind === "invoice" ? "INV" : "RCT";
  const rawReference =
    safeText(transaction.documentNumber, 120) ||
    safeText(transaction.id, 120) ||
    "TRANSACTION";
  const documentId = `${documentPrefix}-${rawReference}`;
  const issueDate =
    kind === "receipt"
      ? transaction.paidAt || transaction.updatedAt
      : transaction.createdAt;

  const customerName =
    safeText(transaction.customerName, 180) ||
    safeText(customer.name, 180) ||
    "Customer";
  const customerEmail =
    safeText(transaction.customerEmail, 180) ||
    safeText(customer.email, 180);
  const customerPhone =
    safeText(transaction.phone, 80) ||
    safeText(customer.phone, 80);

  const calculatedSubtotal = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );
  const recordedTotal = Math.max(
    0,
    finiteNumber(transaction.total, calculatedSubtotal)
  );
  const total =
    recordedTotal > 0 ? recordedTotal : calculatedSubtotal;

  const rows = lines
    .map(
      (line, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(line.name)}</td>
          <td class="numeric">${line.quantity}</td>
          <td class="numeric">${escapeHtml(
            formatMoney(line.price)
          )}</td>
          <td class="numeric">${escapeHtml(
            formatMoney(line.price * line.quantity)
          )}</td>
        </tr>
      `
    )
    .join("");

  const truncatedNotice =
    Array.isArray(transaction.lines) &&
    transaction.lines.length > MAX_DOCUMENT_LINES
      ? `<p class="notice">Only the first ${MAX_DOCUMENT_LINES} product lines are shown.</p>`
      : "";

  const paymentPanel =
    kind === "receipt"
      ? `
        <section class="summary-panel">
          <div>
            <span>Payment method</span>
            <strong>${escapeHtml(
              titleCase(transaction.paymentMethod || "payment")
            )}</strong>
          </div>
          <div>
            <span>Payment reference</span>
            <strong>${escapeHtml(
              transaction.paymentReference || "Not supplied"
            )}</strong>
          </div>
          <div>
            <span>Amount received</span>
            <strong>${escapeHtml(formatMoney(total))}</strong>
          </div>
        </section>
      `
      : `
        <section class="summary-panel one-column">
          <div>
            <span>Payment status</span>
            <strong>${escapeHtml(
              titleCase(transaction.status || "pending")
            )}</strong>
          </div>
        </section>
      `;

  const origin =
    typeof window !== "undefined"
      ? safeText(window.location.origin, 300)
      : "";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />
  <title>${escapeHtml(documentId)} | ${escapeHtml(storeName)}</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #172019;
      --muted: #627066;
      --line: #dce4de;
      --accent: #1f6b43;
      --soft: #f4f7f5;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
      background: #edf2ee;
      color: var(--ink);
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 24px;
    }

    .sheet {
      width: min(850px, 100%);
      min-height: 1050px;
      margin: 0 auto;
      padding: 48px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(20, 30, 23, 0.12);
    }

    .header {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      padding-bottom: 26px;
      border-bottom: 2px solid var(--accent);
    }

    .brand h1 {
      margin: 0;
      color: var(--accent);
      font-size: 32px;
    }

    .brand p,
    .meta p,
    .customer p {
      margin: 5px 0;
      color: var(--muted);
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .document-title {
      text-align: right;
    }

    .document-title h2 {
      margin: 0;
      font-size: 27px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .document-title strong {
      display: block;
      margin-top: 9px;
      color: var(--accent);
      overflow-wrap: anywhere;
    }

    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin: 30px 0;
    }

    .details h3 {
      margin: 0 0 12px;
      color: var(--muted);
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 22px;
    }

    th {
      padding: 12px 10px;
      background: var(--soft);
      border-bottom: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      text-align: left;
      text-transform: uppercase;
    }

    td {
      padding: 14px 10px;
      border-bottom: 1px solid var(--line);
      font-size: 14px;
      overflow-wrap: anywhere;
    }

    .numeric {
      text-align: right;
      white-space: nowrap;
    }

    .totals {
      width: min(360px, 100%);
      margin: 24px 0 0 auto;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 11px 0;
      border-bottom: 1px solid var(--line);
    }

    .grand-total {
      color: var(--accent);
      font-size: 20px;
      font-weight: 800;
    }

    .summary-panel {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
      margin-top: 34px;
      padding: 20px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--soft);
    }

    .summary-panel.one-column {
      grid-template-columns: 1fr;
    }

    .summary-panel span {
      display: block;
      margin-bottom: 6px;
      color: var(--muted);
      font-size: 12px;
    }

    .summary-panel strong {
      overflow-wrap: anywhere;
    }

    .notice {
      margin: 18px 0 0;
      color: #8a5a00;
      font-size: 12px;
    }

    .footer {
      margin-top: 55px;
      padding-top: 20px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
      text-align: center;
    }

    @page {
      size: A4;
      margin: 12mm;
    }

    @media print {
      html,
      body {
        background: #fff;
      }

      body {
        padding: 0;
      }

      .sheet {
        width: 100%;
        min-height: auto;
        margin: 0;
        padding: 0;
        box-shadow: none;
      }

      tr,
      .summary-panel,
      .totals {
        break-inside: avoid;
      }
    }

    @media (max-width: 650px) {
      body {
        padding: 10px;
      }

      .sheet {
        min-height: auto;
        padding: 24px;
      }

      .header,
      .details {
        display: block;
      }

      .document-title {
        margin-top: 24px;
        text-align: left;
      }

      .summary-panel {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <header class="header">
      <div class="brand">
        <h1>${escapeHtml(storeName)}</h1>
        <p>${escapeHtml(storeAddress)}</p>
        ${storePhone ? `<p>${escapeHtml(storePhone)}</p>` : ""}
        ${storeEmail ? `<p>${escapeHtml(storeEmail)}</p>` : ""}
        ${origin ? `<p>${escapeHtml(origin)}</p>` : ""}
      </div>

      <div class="document-title">
        <h2>${
          kind === "invoice" ? "Sales invoice" : "Payment receipt"
        }</h2>
        <strong>${escapeHtml(documentId)}</strong>
      </div>
    </header>

    <section class="details">
      <div class="customer">
        <h3>${kind === "invoice" ? "Bill to" : "Received from"}</h3>
        <p><strong>${escapeHtml(customerName)}</strong></p>
        ${customerEmail ? `<p>${escapeHtml(customerEmail)}</p>` : ""}
        ${customerPhone ? `<p>${escapeHtml(customerPhone)}</p>` : ""}
      </div>

      <div class="meta">
        <h3>Document details</h3>
        <p>
          <strong>Date:</strong>
          ${escapeHtml(formatDate(issueDate))}
        </p>
        <p>
          <strong>Sales channel:</strong>
          ${escapeHtml(titleCase(transaction.channel))}
        </p>
        <p>
          <strong>Order reference:</strong>
          ${escapeHtml(rawReference)}
        </p>
      </div>
    </section>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th class="numeric">Qty</th>
            <th class="numeric">Unit price</th>
            <th class="numeric">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    ${truncatedNotice}

    <section class="totals">
      <div class="total-row">
        <span>Subtotal</span>
        <strong>${escapeHtml(
          formatMoney(calculatedSubtotal)
        )}</strong>
      </div>
      <div class="total-row">
        <span>Additional charges</span>
        <strong>${escapeHtml(formatMoney(0))}</strong>
      </div>
      <div class="total-row grand-total">
        <span>Total</span>
        <strong>${escapeHtml(formatMoney(total))}</strong>
      </div>
    </section>

    ${paymentPanel}

    <footer class="footer">
      <p>Thank you for shopping with ${escapeHtml(storeName)}.</p>
      <p>
        This document was generated from Duka&apos;s recorded sales
        history.
      </p>
    </footer>
  </main>
</body>
</html>`;

  return { html, documentId };
}

export function openSalesDocument(
  kind: SalesDocumentKind,
  transaction: SalesDocumentTransaction,
  customer: SalesDocumentCustomer
): void {
  if (
    kind === "receipt" &&
    !["paid", "fulfilled"].includes(
      safeText(transaction.status, 60)
    )
  ) {
    throw new Error(
      "A payment receipt can only be created for a paid transaction."
    );
  }

  if (
    typeof window === "undefined" ||
    typeof document === "undefined"
  ) {
    throw new Error(
      "Sales documents can only be opened in a browser."
    );
  }

  const { html, documentId } = buildDocumentHtml(
    kind,
    transaction,
    customer
  );

  closeExistingPreview();

  const previousBodyOverflow = document.body.style.overflow;
  const overlay = document.createElement("div");
  overlay.id = PREVIEW_ID;
  overlay.dataset.previousBodyOverflow = previousBodyOverflow;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute(
    "aria-label",
    `${
      kind === "invoice" ? "Sales invoice" : "Payment receipt"
    } preview`
  );

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    display: "flex",
    flexDirection: "column",
    background: "#172019",
  });

  const toolbar = document.createElement("div");

  Object.assign(toolbar.style, {
    minHeight: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 16px",
    background: "#ffffff",
    borderBottom: "1px solid #dce4de",
    boxShadow: "0 4px 16px rgba(0,0,0,.14)",
  });

  const title = document.createElement("div");
  title.textContent = documentId;

  Object.assign(title.style, {
    minWidth: "0",
    overflow: "hidden",
    color: "#172019",
    fontFamily: "Arial, Helvetica, sans-serif",
    fontSize: "14px",
    fontWeight: "700",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  });

  const actions = document.createElement("div");

  Object.assign(actions.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexShrink: "0",
  });

  function makeButton(
    label: string,
    background: string
  ): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;

    Object.assign(button.style, {
      minHeight: "40px",
      border: "0",
      borderRadius: "8px",
      padding: "9px 16px",
      background,
      color: "#ffffff",
      cursor: "pointer",
      fontFamily: "Arial, Helvetica, sans-serif",
      fontSize: "13px",
      fontWeight: "700",
    });

    return button;
  }

  const printButton = makeButton("Open print page", "#1f6b43");
  const closeButton = makeButton("Close", "#59645c");
  printButton.disabled = true;
  printButton.style.opacity = "0.55";
  printButton.style.cursor = "wait";

  actions.append(printButton, closeButton);
  toolbar.append(title, actions);

  const frame = document.createElement("iframe");
  frame.title = `${documentId} preview`;

  Object.assign(frame.style, {
    width: "100%",
    flex: "1 1 auto",
    border: "0",
    background: "#edf2ee",
  });

  let closed = false;

  const closePreview = () => {
    if (closed) return;
    closed = true;

    window.removeEventListener("keydown", handleKeyDown);

    if (overlay.isConnected) {
      overlay.remove();
    }

    document.body.style.overflow = previousBodyOverflow;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePreview();
    }
  };

  closeButton.addEventListener("click", closePreview);

  printButton.addEventListener("click", () => {
    printButton.disabled = true;
    printButton.textContent = "Opening...";

    try {
      const controls = `
        <style>
          .duka-print-controls {
            position: sticky;
            top: 0;
            z-index: 9999;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 12px;
            background: #172019;
            box-shadow: 0 4px 16px rgba(0, 0, 0, .18);
          }

          .duka-print-controls button {
            min-height: 42px;
            border: 0;
            border-radius: 8px;
            padding: 10px 18px;
            color: #fff;
            background: #1f6b43;
            cursor: pointer;
            font: 700 14px Arial, Helvetica, sans-serif;
          }

          .duka-print-controls button:last-child {
            background: #59645c;
          }

          @media print {
            .duka-print-controls {
              display: none !important;
            }
          }
        </style>

        <div class="duka-print-controls">
          <button
            id="duka-native-print"
            type="button"
          >
            Print / Save PDF
          </button>

          <button
            id="duka-close-print-page"
            type="button"
          >
            Close
          </button>
        </div>

        <script>
          (() => {
            let printing = false;

            const printButton =
              document.getElementById("duka-native-print");
            const closeButton =
              document.getElementById("duka-close-print-page");

            printButton?.addEventListener("click", () => {
              if (printing) return;

              printing = true;
              printButton.disabled = true;
              printButton.textContent = "Opening print preview...";

              window.setTimeout(() => {
                window.print();
              }, 100);
            });

            window.addEventListener("afterprint", () => {
              printing = false;

              if (printButton) {
                printButton.disabled = false;
                printButton.textContent = "Print / Save PDF";
              }
            });

            closeButton?.addEventListener("click", () => {
              window.close();
            });
          })();
        <\/script>
      `;

      const printableHtml = html.includes("<body>")
        ? html.replace("<body>", `<body>${controls}`)
        : html;

      const blob = new Blob(
        [printableHtml],
        { type: "text/html;charset=utf-8" }
      );
      const printUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = printUrl;
      link.target = "_blank";
      link.rel = "noopener";
      link.setAttribute(
        "aria-label",
        `Open ${documentId} print page`
      );

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(printUrl);
      }, 10 * 60 * 1000);
    } catch (printError) {
      console.error("Could not open sales document print page:", printError);
      window.alert(
        "The print page could not be opened. Check that browser pop-ups are allowed, then try again."
      );
    } finally {
      window.setTimeout(() => {
        printButton.disabled = false;
        printButton.textContent = "Open print page";
      }, 700);
    }
  });

  frame.addEventListener(
    "load",
    () => {
      printButton.disabled = false;
      printButton.style.opacity = "1";
      printButton.style.cursor = "pointer";
    },
    { once: true }
  );

  window.addEventListener("keydown", handleKeyDown);
  document.body.style.overflow = "hidden";
  overlay.append(toolbar, frame);
  document.body.appendChild(overlay);

  // Assign srcdoc only after the iframe is mounted. This avoids repeated
  // document.write calls and keeps the preview isolated from the app.
  frame.srcdoc = html;
}