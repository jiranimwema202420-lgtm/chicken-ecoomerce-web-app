# Duka Ecommerce Architecture

## Objective

Duka Ecommerce is organised as a modular Next.js application that can grow without concentrating all business logic in pages and route handlers.

## Recommended module boundaries

```text
src/
  app/                  Route composition and HTTP entry points
  components/           Shared visual components
  features/             Domain-specific UI and client logic
    auth/
    customers/
    inventory/
    orders/
    payments/
    products/
    suppliers/
  lib/                  Cross-cutting utilities and infrastructure adapters
  server/               Server-only services and repositories
    repositories/
    services/
    validation/
  store/                Small client state stores
  types/                Shared TypeScript contracts
```

## Layering rules

1. Pages compose features; they should not contain complex business rules.
2. Route handlers validate input, authorize the caller and delegate to services.
3. Services implement business workflows such as order placement and stock reservation.
4. Repositories contain Firestore access and transaction details.
5. Shared validation schemas are used by both forms and route handlers.
6. Components do not import Firebase Admin or server-only modules.
7. External services such as M-Pesa are accessed through dedicated adapters.
8. Every stock-changing workflow writes an auditable inventory movement.

## Scalability priorities

- Keep Firestore reads bounded and paginated.
- Avoid loading entire collections into admin pages.
- Add composite indexes for production queries.
- Use idempotency keys for payments, callbacks and order creation.
- Use transactions for stock reservation and release.
- Separate customer-facing and admin authorization.
- Add structured logs with order, payment and request identifiers.
- Cache public catalogue data carefully while keeping stock authoritative.
- Run long-running work through queues or scheduled jobs when volume grows.

## Deployment environments

- **Local**: developer machine and Firebase development resources.
- **Preview**: Vercel deployment per branch or pull request.
- **Production**: protected `main` branch and production environment variables.

Never reuse production credentials in local or preview environments.