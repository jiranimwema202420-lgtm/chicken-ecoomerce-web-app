# Duka â€” Next.js E-commerce with M-Pesa

Duka is a production-oriented Kenyan e-commerce starter built with Next.js 15,
React 19, Tailwind CSS, Firebase, and Safaricom Daraja STK Push. It includes a
responsive storefront, persistent cart, secure server-verified checkout, and an
admin catalogue dashboard.

## Included features

- Responsive storefront with hero section, search, and category filters.
- Product details, stock-aware quantities, and a Zustand-persisted cart.
- M-Pesa STK Push checkout using Daraja sandbox or production credentials.
- Server-side product, price, stock, phone, quantity, and order-total validation.
- Token-protected payment-status API; each customer can read only orders linked to their Firebase UID.
- Customer email/password registration, Google sign-in, password reset, email verification, persistent sessions, profile editing, and order history.
- Anonymous Firebase guest checkout with account linking so guest orders can be retained after registration.
- Secure repeat ordering with live price and stock refresh, plus private saved-order templates.
- Unique-customer and repeat-customer metrics in the administrator revenue dashboard.
- Admin-configured supplier commission attribution with order-time snapshots and private supplier earnings.
- KES 1,000 monthly business memberships with customer renewal requests and administrator M-Pesa verification.
- Active business-member checkout benefits: KES 800 minimum order and KES 100 delivery discount.
- Configurable paid featured supplier product placements with M-Pesa verification and automatic expiry.
- Transactional supplier commission settlement with outstanding balances, payout references, supplier history, and CSV export.
- Featured-listing ROI analytics with browser engagement events and server-trusted paid-order revenue attribution.
- Transactional stock reservations for M-Pesa and pay-on-delivery orders, with idempotent consumption and release audit records.
- Per-attempt checkout idempotency keys prevent duplicate orders and duplicate reservations.
- Automatic expiry of unpaid M-Pesa reservations after 15 minutes during checkout status polling, plus a protected cleanup route for an external scheduler.
- Idempotent M-Pesa callback handling without duplicate stock reduction.
- Firebase email/password admin login with an `admin: true` custom claim.
- Product create, edit, delete, visibility, stock, pricing, and image upload tools.
- Hardened Firestore and Storage rules plus the required Firestore index.
- Safe Firebase configuration guard so an unconfigured build shows setup guidance
  rather than crashing during prerendering.

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| UI | React 19, Tailwind CSS 3, Lucide icons |
| Client state | Zustand |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Product images | Firebase Storage |
| Payments | Safaricom Daraja STK Push |
| Hosting | Vercel |
| Language | TypeScript |

## Project structure

```text
src/
  app/
    page.tsx                     storefront and filters
    product/[id]/page.tsx        product detail
    cart/page.tsx                persistent shopping cart
    checkout/page.tsx            authenticated/guest M-Pesa checkout
    login/page.tsx               customer email and Google sign-in
    register/page.tsx            customer registration and guest linking
    forgot-password/page.tsx     password reset
    account/page.tsx             profile, verification, and order history
    admin/                       protected dashboard and product CRUD
    api/
      mpesa/stkpush/route.ts      validates cart and starts STK Push
      mpesa/callback/route.ts     processes Daraja callback
      orders/[id]/route.ts        token-protected order status
  components/                    storefront and admin UI
  lib/                           Firebase, auth, M-Pesa, types, hooks
  store/cart-store.ts            cart state
scripts/
  setAdminClaim.mjs              grants admin claim
  seedProducts.mjs               creates starter general products
  seedBroilerProducts.mjs         adds broiler chicken variants
firestore.rules
storage.rules
firebase.indexes.json
```

## Requirements

- Node.js 20.9 or newer.
- A Firebase project with Authentication, Firestore, and Storage enabled.
- Safaricom Daraja credentials for M-Pesa STK Push.
- A public HTTPS callback URL for M-Pesa testing.

## 1. Install the project

```powershell
npm install
Copy-Item .env.example .env.local
```

For Bash or Git Bash:

```bash
npm install
cp .env.example .env.local
```

Fill every required value in `.env.local`. Never commit that file.

## 2. Configure Firebase

1. In Firebase Authentication, enable **Email/Password**, **Google**, and
   **Anonymous** providers.
2. Under Authentication â†’ Settings â†’ Authorized domains, include `localhost`
   for development and your Vercel/custom production domain.
3. Create a Firestore database and a Firebase Storage bucket.
4. Create a Firebase Web App and copy its values into the
   `NEXT_PUBLIC_FIREBASE_*` variables.
5. Generate a service-account key and add its values to the
   `FIREBASE_ADMIN_*` variables. Keep these server-only. These credentials are
   required by checkout, callbacks, and token verification.
6. Deploy rules and indexes:

```powershell
npm install --global firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Create an administrator in Firebase Authentication, then grant the custom claim:

```powershell
npm run set-admin -- admin@example.com
```

The administrator must sign out and sign in again before the claim is available.

Optionally seed the six general starter products:

```powershell
npm run seed
```

Add the broiler chicken catalogue without deleting existing products:

```powershell
npm run seed:broilers
```

The broiler seed adds whole-bird weight variants, common cuts, offal, and value
packs with local starter artwork. Prices and stock are starter values; review
them from `/admin/products` before production deployment. Any product image can
be replaced through the admin dashboard.

## 3. Configure M-Pesa Daraja

Use Daraja sandbox credentials first:

- `MPESA_ENV=sandbox`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE=174379` for the standard sandbox flow
- `MPESA_PASSKEY`
- `MPESA_CALLBACK_URL=https://your-public-domain/api/mpesa/callback`

Safaricom cannot call `localhost`. For local testing, expose port 3000 through an
HTTPS tunnel and place that public URL in `MPESA_CALLBACK_URL`.

```powershell
ngrok http 3000
```

For production, replace the sandbox credentials, shortcode, passkey, and callback
URL with the values approved for your paybill or till.

## 4. Run locally

```powershell
npm run dev
```

Open `http://localhost:3000`.

Useful routes:

- `/` â€” storefront
- `/cart` â€” shopping cart
- `/checkout` â€” M-Pesa checkout with signed-in or anonymous guest identity
- `/login` â€” customer sign-in
- `/register` â€” customer registration
- `/forgot-password` â€” password reset
- `/account` â€” profile, email verification, sign-out, and order history
- `/admin/login` â€” administrator sign-in
- `/admin/products` â€” product management
- `/admin/revenue` â€” private costs, delivery pricing, minimum orders, and profit estimates

## Local Firestore emulator

The project uses the Firestore rules defined in `firestore.rules` and the local
ports documented in `AGENT.md`.

Install and authenticate the Firebase CLI once, then start Firestore locally:

```powershell
npm install --global firebase-tools
firebase login
npm run rules:emulator
```

In a second PowerShell window, direct the application to the emulator:

```powershell
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8185"
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "true"
npm run dev
```

The Firestore emulator does not copy Firebase Authentication users. Authentication
remains connected to the configured Firebase project unless an Authentication
emulator is explicitly added.

Version helpers are available for controlled release preparation:

```powershell
npm run version:show
npm run release:patch
npm run release:minor
npm run release:major
```

The release commands update `package.json` and `package-lock.json` without
creating a Git tag or commit. Review the diff, update `CHANGELOG.md`, run
`npm run validate`, and commit explicit files.

## 5. Validate before deployment

```powershell
npm run check
npm run build
```

`npm run validate` runs ESLint, strict TypeScript checking, and the production build.

For payment changes, test all three paths with Daraja sandbox:

1. Successful STK approval: order becomes `paid`, receipt is stored, stock reduces.
2. Rejected or cancelled prompt: order becomes `failed`.
3. Timeout/no response: checkout stops waiting and tells the customer to verify
   their M-Pesa messages before retrying.

## 6. Deploy to Vercel

```powershell
npm install --global vercel
vercel
vercel --prod
```

Add every variable from `.env.example` to Vercel Environment Variables. Set the
live callback to:

```text
https://your-domain/api/mpesa/callback
```

Redeploy after changing environment variables.

## Checkout security model

The browser submits only product IDs and quantities. The server loads current
products from Firestore, rejects inactive or insufficient-stock items, and
recalculates the total before sending the M-Pesa prompt. A random status token is
returned once and only its SHA-256 hash is stored with the order. Checkout uses
that token through `/api/orders/[id]` while it waits for the M-Pesa result.

Every checkout also sends a Firebase ID token. Signed-in customers use their
normal UID; guests receive an anonymous Firebase UID. The server verifies that
token before storing `userId` on the order. Firestore rules allow customers to
read only documents where `order.userId == request.auth.uid`; writes remain
server/admin controlled. Linking an anonymous user to a new email or Google
credential preserves the same UID and therefore preserves guest order history.

M-Pesa PINs never enter this application. PIN entry occurs entirely on the
customer's handset.

## Revenue and profitability controls

Checkout retrieves public delivery zones from `/api/commerce/pricing`, but all
totals are recalculated by the server. Customers submit only the selected zone,
product IDs and quantities. The server enforces the configured minimum order,
applies the delivery fee or free-delivery threshold, and stores an immutable
`pricingBreakdown` with the order.

Product landed and packaging costs are stored in the server-only
`productEconomics` collection rather than public product documents. Delivery
settings are stored in `commerceSettings/revenue`. Both collections are denied
to browser clients by the existing default-deny Firestore rules and are managed
through the admin-authorized revenue API.

Until an administrator saves settings, checkout uses conservative defaults:

- KES 3,000 default minimum order
- Nairobi central, Greater Nairobi, and custom-location delivery zones
- 0.5% estimated M-Pesa merchant fee capped at KES 200

Review and replace these defaults in `/admin/revenue` before taking live orders.

## Recommended production additions

Before high-volume use, add request rate limiting, order reservation/release for
competing checkouts, delivery-address and fulfilment workflows, receipt messages,
observability, and automated integration tests against Daraja sandbox.

## Inventory monitoring

Vercel Cron calls /api/cron/release-stock-reservations every five minutes using CRON_SECRET. Administrators can monitor available and reserved units, release expired reservations manually, and export the server-only inventory audit. Suppliers see alerts only for products assigned to their active profile.
