# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project summary

Next.js 15 App Router e-commerce application using Firebase
(Auth/Firestore/Storage), Zustand cart state, and Safaricom Daraja STK Push.
It is designed for Vercel and uses TypeScript throughout `src/`.

## Setup and verification

```bash
npm install
cp .env.example .env.local
npm run dev
npm run check
npm run build
```

Node.js 20.9+ is required. `npm run check` runs ESLint and TypeScript. Never
consider a change complete until both `npm run check` and `npm run build` pass.

## Code conventions

- Use TypeScript for all application code. No new `.js` files under `src/`.
- Use the `@/*` alias for imports from `src/`.
- Any file using hooks, browser APIs, Zustand, or Firebase client SDK calls must
  start with `"use client"`.
- Firebase Admin SDK is server-only. Never import `firebaseAdmin.ts` into a
  Client Component.
- Admin UI actions must check `isAdmin` from `useAuth()` and must also be
  protected by matching Firestore or Storage rules.
- Store money as a KES number. Do not trust client-submitted prices or totals.
  Round only at the Daraja call boundary with `Math.ceil`.
- Use Tailwind utilities. Shared patterns belong in `globals.css`; do not add a
  parallel styling system.
- Never commit `.env.local`, service-account data, M-Pesa credentials, or other
  secrets. Only Firebase Web App settings may use `NEXT_PUBLIC_*`.

## Important files

| Concern | File |
|---|---|
| Firebase client initialization/guard | `src/lib/firebase.ts` |
| Firebase Admin initialization | `src/lib/firebaseAdmin.ts` |
| Auth state and admin claim | `src/lib/auth-context.tsx` |
| M-Pesa helpers | `src/lib/mpesa.ts` |
| Shared data types | `src/lib/types.ts` |
| Product subscriptions | `src/lib/useProducts.ts` |
| Cart state | `src/store/cart-store.ts` |
| Product form | `src/components/admin/ProductForm.tsx` |
| STK Push route | `src/app/api/mpesa/stkpush/route.ts` |
| Daraja callback | `src/app/api/mpesa/callback/route.ts` |
| Protected order status | `src/app/api/orders/[id]/route.ts` |
| Firestore rules/indexes | `firestore.rules`, `firebase.indexes.json` |
| Storage rules | `storage.rules` |

## Checkout invariants

- The client sends product IDs and quantities only.
- The STK route must fetch current Firestore products and calculate the total.
- Reject missing, inactive, invalid-price, or insufficient-stock products.
- Do not make order documents publicly readable. Customer status access uses a
  random token; only its hash is stored.
- Callback processing must be idempotent. Never downgrade a paid order.
- Stock reduction occurs only after a confirmed successful callback.
- Always test success, rejection, and timeout paths with Daraja sandbox.
- M-Pesa PIN/card data must never be requested, logged, or stored.

## Product-management invariants

- Product writes require both an admin claim and restrictive Firebase rules.
- Image uploads must remain under `products/`, use an image MIME type, and be no
  larger than 5 MB.
- Verify create and edit flows, image URL updates, storefront visibility, and
  out-of-stock behavior after product changes.

## Avoid

- Adding Vite or another competing bundler.
- Importing Node-only modules into Client Components.
- Relaxing rules to `allow write: if true`.
- Trusting cart names, prices, image URLs, or totals received from the browser.
- Exposing `FIREBASE_ADMIN_*` or `MPESA_*` through client code.
