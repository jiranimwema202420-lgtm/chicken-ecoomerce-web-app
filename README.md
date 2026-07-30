# Duka Broilers Ecommerce

Duka Broilers is a production-oriented wholesale poultry ecommerce platform for
hotels, restaurants, supermarkets, street vendors, hospitals, schools,
institutions, caterers, and other commercial buyers in Kenya.

The application combines a wholesale marketing site, searchable catalogue,
customer and guest checkout, M-Pesa payments, pay on delivery, order tracking,
invoices, receipts, supplier workflows, stock management, administration,
role-based access control, and deployment observability.

## Production

- Application: `https://duka-ecommerce-one.vercel.app`
- Health check: `https://duka-ecommerce-one.vercel.app/api/health`
- Version metadata: `https://duka-ecommerce-one.vercel.app/api/version`

## Capabilities

### Buyer experience

- Wholesale broiler marketing landing page at `/`.
- Searchable product catalogue at `/shop`.
- Product details, stock-aware quantities, and persistent cart state.
- Email/password, Google, and anonymous Firebase authentication flows.
- Guest-to-account linking that preserves the Firebase UID and order history.
- M-Pesa STK Push and pay-on-delivery checkout.
- Customer order tracking, profiles, order history, invoices, and receipts.
- Persistent light, dark, and system theme preference.
- Accessible validation summaries, field errors, inline errors, route errors,
  and reusable error boundaries.

### Operations and administration

- Protected administrator login and dashboard.
- Product, price, category, visibility, image, and stock management.
- Inventory synchronisation and stock-aware fulfilment.
- Supplier portal and supplier-order workflows.
- Customer, order, payment, fulfilment, and dispute records.
- Role-based access for administration, operations, inventory, finance,
  accounting, support, suppliers, and customers.
- Firestore deny-by-default rules and server-side Firebase token verification.
- Health and version endpoints for deployment verification.
- GitHub Actions validation, semantic versioning, release scripts, and changelog.

## Technology stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 App Router |
| UI | React 19, TypeScript, Tailwind CSS 3, Lucide |
| Client state | Zustand |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| Payments | Safaricom Daraja M-Pesa |
| Hosting | Vercel |
| CI | GitHub Actions |
| Local security testing | Firebase Emulator Suite |
| Versioning | Semantic Versioning and Git tags |

## Requirements

- Node.js 24 recommended; Node.js 20.9 or newer is supported.
- npm.
- Java 21 for Firebase emulators.
- Firebase Authentication, Firestore, Storage, and Admin credentials.
- Safaricom Daraja credentials.
- Vercel CLI and Git.

## Project structure

```text
src/
  app/                            routes, layouts, pages, and APIs
    page.tsx                      wholesale marketing landing page
    shop/                         catalogue
    product/[id]/                 product detail
    cart/                         cart
    checkout/                     checkout
    account/                      customer account and orders
    settings/                     theme and preferences
    admin/                        protected administration
    supplier/                     supplier workflows
    api/health/                   health endpoint
    api/version/                  version endpoint
    api/mpesa/                    M-Pesa integration
    api/orders/                   protected order APIs
  components/
    admin/                        admin UI
    feedback/                     error and validation UI
    theme/                        theme provider and controls
  features/                       domain modules as the app grows
  lib/
    firebase.ts                   Firebase client SDK
    firebaseAdmin.ts              Firebase Admin SDK
    server/rbac.ts                server authorization guards
    validation.ts                 validation helpers
    app-version.ts                deployment metadata
  store/                          Zustand stores
scripts/
  set-user-role.mjs               assign Firebase roles
  seedProducts.mjs                seed starter products
  seedBroilerProducts.mjs         seed broiler products
  version/                        release scripts
docs/
  ARCHITECTURE.md
  GIT-WORKFLOW.md
  RBAC-SECURITY.md
.github/workflows/ci.yml
firestore.rules
storage.rules
firebase.json
VERSION
CHANGELOG.md
AGENT.md
```

## Installation

```powershell
cd "C:\DukaDev\duka"
npm install
Copy-Item ".env.example" ".env.local"
```

Never commit `.env.local`, service-account JSON files, private keys, M-Pesa
credentials, Vercel tokens, or other secrets.

## Environment variables

### Firebase client

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Firebase Admin

```env
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

### M-Pesa

```env
MPESA_ENV=sandbox
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=
```

### Storefront

```env
NEXT_PUBLIC_STORE_PHONE=
NEXT_PUBLIC_STORE_EMAIL=
NEXT_PUBLIC_WHATSAPP_NUMBER=
```

### Local emulator only

```env
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
```

Do not add the emulator variable to Vercel Production.

## Firebase setup

Enable the required Authentication providers:

- Email/Password
- Google
- Anonymous

Add `localhost` and all production domains to Authentication authorized domains.
Create Firestore and Storage, configure the client values, and keep Admin values
server-only.

## Run locally

```powershell
npm run dev
```

Use the exact port printed by Next.js.

| Route | Purpose |
|---|---|
| `/` | Wholesale landing page |
| `/shop` | Catalogue |
| `/cart` | Cart |
| `/checkout` | Checkout |
| `/login` | Customer login |
| `/register` | Registration |
| `/account` | Account and order history |
| `/settings` | Theme settings |
| `/admin/login` | Administrator login |
| `/admin` | Administration |
| `/api/health` | Health check |
| `/api/version` | Version metadata |

## Firestore emulator

The project uses an isolated port range because local Apache uses port 8080:

```text
Firestore: 127.0.0.1:8185
Emulator UI: http://127.0.0.1:4100
Hub: 127.0.0.1:4505
Logging: 127.0.0.1:4600
```

Start it:

```powershell
npm run rules:emulator
```

In a second PowerShell window:

```powershell
cd "C:\DukaDev\duka"
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8185"
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "true"
npm run dev
```

The Firestore emulator does not automatically emulate Firebase Authentication.
Unless Auth is explicitly connected to an Auth emulator, login uses the
configured Firebase project.

## RBAC

| Role | Access focus |
|---|---|
| `admin` | Full administration |
| `operations` | Orders, suppliers, and operations |
| `order_manager` | Order administration |
| `inventory_manager` | Products and inventory |
| `finance` | Payments and finance |
| `accountant` | Reconciliation |
| `support` | Customers, orders, and disputes |
| `supplier` | Own supplier records |
| `customer` | Own profile and commerce records |

Assign a role from a trusted administrator workstation:

```powershell
npm run rbac:set-role -- user@example.com inventory_manager
```

The user must sign out and sign in again after custom claims change.

Firestore client rules and server authorization are separate. Firebase Admin
bypasses Firestore Security Rules, so protected APIs using Admin SDK must call a
guard from `src/lib/server/rbac.ts`.

## Validation and build

```powershell
npm run validate
```

Equivalent checks:

```powershell
npm run lint
npm run typecheck
npm run build
```

## Common scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm run validate` | Lint, typecheck, and build |
| `npm run seed` | Seed starter products |
| `npm run seed:broilers` | Seed broiler products |
| `npm run rbac:set-role -- <email> <role>` | Assign role |
| `npm run rules:emulator` | Start Firestore emulator |
| `npm run rules:deploy` | Deploy Firestore rules |
| `npm run version:show` | Show version |
| `npm run release:patch` | Prepare patch release |
| `npm run release:minor` | Prepare minor release |
| `npm run release:major` | Prepare major release |

## Git workflow

Do not develop substantial changes directly on `main`.

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Stage explicit files. Do not use `git add .`.

```powershell
git add src/app/example/page.tsx src/components/Example.tsx
git diff --cached --check
git diff --cached --stat
git commit -m "feat: add example capability"
git push -u origin feature/short-description
```

Supported prefixes: `feat:`, `fix:`, `security:`, `refactor:`, `perf:`,
`test:`, `docs:`, `chore:`, and `release:`.

## Releases

```powershell
npm run release:patch
npm run release:minor
npm run release:major
```

Review `CHANGELOG.md`, commit the prepared version, create the annotated tag,
and push using the instructions printed by the release script.

## Deployment

Firestore rules and Vercel deploy separately.

Test rules in the emulator, then:

```powershell
npm run rules:deploy
```

Validate and deploy a preview:

```powershell
npm run validate
npx vercel deploy --logs
```

Deploy production:

```powershell
npx vercel deploy --prod --logs
```

Verify `/`, `/shop`, `/admin/login`, `/api/health`, and `/api/version`.

## Security principles

- Never expose Firebase Admin credentials to client code.
- Never commit secrets or service-account JSON files.
- Verify Firebase ID tokens on protected APIs.
- Never trust role, price, stock, total, payment status, or UID from the client.
- Keep payment, invoice, inventory-movement, and audit writes server-only.
- Recalculate prices and totals server-side.
- Use idempotency for payments and order creation.
- Use Firestore transactions for stock changes.
- Restrict customer queries by verified ownership.
- Record privileged changes with actor UID and timestamps.
- Rotate exposed credentials.

## Release verification

A release is complete only when:

1. `npm run validate` passes.
2. Firestore rules pass emulator tests.
3. Vercel Production variables are complete.
4. No emulator variables exist in Production.
5. `/api/health` reports healthy.
6. `/api/version` reports the expected version and commit.
7. Customer and admin login work.
8. Product browsing, checkout, and tracking work.
9. Firestore and Vercel logs show no new critical errors.
