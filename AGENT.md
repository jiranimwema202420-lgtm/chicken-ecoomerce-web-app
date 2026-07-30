# AGENT.md

## Mission

Maintain and extend Duka Broilers as a secure, scalable, production-grade
wholesale ecommerce platform. Preserve customer, administrator, supplier,
inventory, payment, and deployment workflows unless an explicit migration is
required.

## Project identity

- Local root: `C:\DukaDev\duka`
- Repository: `jiranimwema202420-lgtm/chicken-ecoomerce-web-app`
- Main branch: `main`
- Production: `https://duka-ecommerce-one.vercel.app`
- Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 3
- Firebase Authentication, Firestore, Storage, and Admin SDK
- Safaricom Daraja M-Pesa
- Vercel and GitHub Actions
- Primary shell: Windows PowerShell

## Non-negotiable rules

1. Never expose, print, commit, or request secrets.
2. Never commit `.env.local`, service-account JSON, private keys, M-Pesa
   credentials, or Vercel tokens.
3. Never use `git add .`; stage explicit files.
4. Do not bypass RBAC to make a feature work.
5. Do not trust role, price, stock, payment status, user ID, or totals supplied
   by the client.
6. Firebase Admin bypasses Firestore rules; protected server routes must enforce
   RBAC independently.
7. Keep payment, invoice, order-status, inventory-movement, and audit writes
   server-only.
8. Do not deploy Firestore rules without emulator testing.
9. Do not deploy to Vercel unless lint, typecheck, and build pass.
10. Never add emulator variables to Vercel Production.
11. Preserve UTF-8 without BOM when rewriting source files in PowerShell.
12. Avoid destructive Git operations without explicit authorization.
13. Do not delete or reset live Firestore data without explicit confirmation.
14. Prefer focused commits with clear rollback paths.

## Start-of-task procedure

```powershell
cd "C:\DukaDev\duka"
git status --short
git branch --show-current
```

Inspect relevant files before replacing them. Do not assume local structure from
memory when it can be verified.

For substantial work:

```powershell
git switch main
git pull --ff-only origin main
git switch -c feature/short-description
```

Do not switch branches when uncommitted work could be lost.

## Quality gate

Run after meaningful changes:

```powershell
npm run lint
npm run typecheck
npm run build
```

Preferred consolidated command:

```powershell
npm run validate
```

Do not claim success while any command fails.

## Architecture boundaries

```text
src/
  app/                  routes, layouts, handlers, composition
  components/           reusable visual components
  features/             domain modules
  lib/                  infrastructure and utilities
  lib/server/           server-only authorization and adapters
  store/                client state
  types/                shared contracts
```

Rules:

- Pages compose features; avoid complex business rules in pages.
- Route handlers authenticate, authorize, validate, and delegate.
- Services implement order, stock, payment, and fulfilment workflows.
- Repository functions isolate Firestore access.
- Shared validation is reused where appropriate.
- Server-only code should import `"server-only"`.
- Client components must not import Firebase Admin.
- External integrations belong behind dedicated adapters.
- Stock-changing operations require transactions and audit records.
- List queries must be bounded and paginated.

## Route map

```text
/                         wholesale landing
/shop                     catalogue
/product/[id]             product details
/cart                     cart
/checkout                 checkout
/login                    customer login
/register                 registration
/forgot-password          password reset
/account                  account and orders
/settings                 theme and preferences
/admin/login              administrator login
/admin                    administration
/supplier                 supplier workflows
/api/health               health check
/api/version              version metadata
/api/mpesa/*              M-Pesa integration
/api/orders/*             protected order APIs
```

When moving routes, update navigation, metadata, documentation, and hard-coded
links together.

## Authentication and RBAC

Canonical roles:

```text
admin
operations
order_manager
inventory_manager
finance
accountant
support
supplier
customer
```

Legacy claims may still exist:

```text
admin: true
supplier: true
```

New code should use the canonical role model while migration support may accept
legacy claims.

Protected server routes use `src/lib/server/rbac.ts`, including:

```ts
requireAdmin(request)
requireOperations(request)
requireInventoryManager(request)
requireFinance(request)
requireSupport(request)
requireRoles(request, ["admin", "support"])
```

Never authorize from UI visibility alone. Hiding a link is not a security
boundary.

After changing claims, the user must sign out and sign in again or refresh the
Firebase ID token.

## Firestore security

Keep least privilege and deny unknown collections by default.

Expected access:

- Anonymous: active public products only.
- Customer: own profile, orders, payments, invoices, and disputes.
- Supplier: own supplier records.
- Support: customer, order, and dispute support data.
- Inventory staff: products, stock, and inventory records.
- Finance staff: payment, invoice, and reconciliation records.
- Admin: explicitly managed resources.
- Browser clients: no trusted payment, invoice, inventory-movement, audit, or
  order-status writes.

Firestore rules are not filters. Ownership-based list queries must include an
ownership constraint, for example:

```ts
where("userId", "==", currentUser.uid)
```

## Emulator workflow

```text
Firestore: 127.0.0.1:8185
UI: 127.0.0.1:4100
Hub: 127.0.0.1:4505
Logging: 127.0.0.1:4600
```

Start Firestore:

```powershell
npm run rules:emulator
```

Start the app in another window:

```powershell
$env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:8185"
$env:NEXT_PUBLIC_USE_FIREBASE_EMULATOR = "true"
npm run dev
```

Firestore emulation does not create or copy Authentication users. Authentication
remains live unless an Auth emulator is explicitly configured.

## Validation and errors

Reusable components:

```text
src/components/feedback/AppErrorBoundary.tsx
src/components/feedback/ValidationSummary.tsx
src/components/feedback/FieldError.tsx
src/components/feedback/InlineError.tsx
src/lib/validation.ts
```

Requirements:

- Validate on client and server; server validation is authoritative.
- Return structured, user-safe errors.
- Do not reveal stack traces, secrets, or Firebase internals in production.
- Log request, user, order, and payment identifiers where appropriate.
- Use accessible roles and `aria-describedby`.
- Do not silently swallow errors.

## Products and inventory

- Load trusted product IDs, prices, active status, and stock server-side.
- Reject inactive or unavailable products during checkout.
- Prevent negative stock.
- Use transactions for reserve, reduction, release, and reconciliation.
- Record actor, reason, order, previous quantity, new quantity, and timestamp.
- Product deletion is admin-only.
- Prefer archive/deactivation when historical orders reference a product.
- Use `next/image` for production assets.
- Plain `<img>` is acceptable only for transient local/blob previews with an
  intentional lint exemption.

## Orders and payments

- Create orders on the server.
- Attach the verified Firebase UID.
- Recalculate totals from trusted product data.
- Use idempotency keys for order creation and payment callbacks.
- Enforce explicit status transitions.
- Do not allow arbitrary client status updates.
- Keep order history owner-scoped or staff-authorized.
- Preserve audit history during corrections.

## M-Pesa

- Never handle or store the customer's M-Pesa PIN.
- Validate Kenyan phone numbers server-side.
- Verify callbacks against the intended order.
- Process callbacks idempotently.
- Do not reduce stock twice.
- Store trusted receipt and result metadata.
- Keep callback URLs and credentials server-only.
- Use HTTPS tunnelling for local callbacks.
- Test success, cancellation, failure, timeout, and duplicate callbacks.

## Pay on delivery

- Keep pay-on-delivery as a distinct method and status.
- Do not mark an order paid before collection.
- Restrict payment-status changes to authorized server workflows.
- Preserve fulfilment and collection audit records.

## Supplier workflows

- Suppliers read only their own records and assigned workflows.
- Supplier onboarding and role assignment remain server-controlled.
- Do not expose other suppliers' pricing, contracts, or orders.
- Separate operations and finance access where practical.

## UI and styling

- Preserve strong contrast in light and dark themes.
- Do not wash out hero images with white overlays.
- Use clear CTA hierarchy and readable line lengths.
- Test mobile, tablet, and desktop.
- Preserve keyboard access and visible focus states.
- Do not encode meaning with colour alone.
- Prefer reusable tokens and components over one-off styles.
- Keep the forest, gold, neutral, and error palette consistent.

## Performance

- Use `next/image` for production images.
- Bound and paginate Firestore queries.
- Avoid loading entire collections into client components.
- Prefer server components when interactivity is unnecessary.
- Avoid duplicate Firebase listeners and clean subscriptions up.
- Cache catalogue data only when stock correctness is preserved.
- Move long-running work to queues or scheduled jobs as traffic grows.

## Git discipline

Commit prefixes:

```text
feat:
fix:
security:
refactor:
perf:
test:
docs:
chore:
release:
```

Before committing:

```powershell
git status --short
git diff --check
npm run validate
```

Stage explicit files:

```powershell
git add README.md AGENT.md
git diff --cached --check
git diff --cached --stat
```

Do not commit build directories, emulator data, logs, or secrets. Roll back
production code with `git revert`, not history deletion.

## Versioning and releases

- Patch: backward-compatible fix.
- Minor: backward-compatible capability.
- Major: breaking change or migration.

```powershell
npm run version:show
npm run release:patch
npm run release:minor
npm run release:major
```

Release preparation must run from a clean, synchronized `main` branch and pass
validation. Update `CHANGELOG.md` for release-visible changes.

## Vercel deployment

Firestore rules and Vercel deployments are separate.

Before deployment:

```powershell
Remove-Item Env:FIRESTORE_EMULATOR_HOST -ErrorAction SilentlyContinue
Remove-Item Env:NEXT_PUBLIC_USE_FIREBASE_EMULATOR -ErrorAction SilentlyContinue
npm run validate
npx vercel env ls production
```

Preview:

```powershell
npx vercel deploy --logs
```

Production:

```powershell
npx vercel deploy --prod --logs
```

Verify the production home page, shop, admin login, health endpoint, version
endpoint, customer login, admin login, and key commerce flows before claiming
success.

## Documentation responsibilities

Update `README.md` when setup, variables, routes, features, scripts, deployment,
authentication, RBAC, or emulator configuration changes.

Update `AGENT.md` when engineering rules, architecture, security expectations,
workflow, or deployment criteria change.

Update `CHANGELOG.md` for release-visible changes.

## Definition of done

A change is complete only when:

1. Requested behavior works.
2. Unauthorized behavior is denied.
3. Validation is present.
4. Errors are user-safe and observable.
5. Light and dark themes remain readable.
6. Mobile and desktop layouts are checked.
7. Lint passes.
8. TypeScript passes.
9. Production build passes.
10. Relevant emulator tests pass.
11. Documentation is updated.
12. Explicit files are committed with a focused message.
13. The deployment can be verified and rolled back.
