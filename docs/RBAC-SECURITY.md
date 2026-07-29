# Duka RBAC Security Model

## Roles

| Role | Primary permissions |
|---|---|
| `admin` | Full administrative access |
| `operations` | Orders, suppliers, inventory operations |
| `order_manager` | Order administration |
| `inventory_manager` | Product and stock administration |
| `finance` | Payments, invoices and finance records |
| `accountant` | Finance read and reconciliation |
| `support` | Customer profiles, orders and disputes |
| `supplier` | Own supplier records only |
| `customer` | Own profile, orders, payments and disputes |

## Enforcement layers

1. **Firebase custom claims** identify the role.
2. **Firestore Security Rules** protect web and mobile client SDK access.
3. **Server RBAC** verifies Firebase ID tokens before Admin SDK operations.
4. **IAM** restricts the Firebase service account used by the server.
5. **App Check** helps reject traffic that does not originate from an approved app.
6. **Audit logs** record privileged operations.

Firestore rules do not protect Firebase Admin SDK access. Every API route using
the Admin SDK must call a function from `src/lib/server/rbac.ts` before reading
or mutating protected data.

## Route-handler pattern

```ts
import {
  authorizationErrorResponse,
  requireInventoryManager,
} from "@/lib/server/rbac";

export async function POST(request: Request) {
  try {
    const principal = await requireInventoryManager(request);

    // Perform the authorized operation.
    // Include principal.uid in the audit event.

    return Response.json({ ok: true });
  } catch (error) {
    return authorizationErrorResponse(error);
  }
}
```

## Assign a role

Run from a trusted administrator workstation. Do not expose this command in a
public API route.

```powershell
node scripts/set-user-role.mjs user@example.com inventory_manager
```

After a role change, the user must sign in again or force-refresh their Firebase
ID token.

## Deployment sequence

1. Test rules with the Firebase Emulator Suite.
2. Confirm each application query satisfies the new rules.
3. Deploy rules:
   `npx firebase-tools deploy --only firestore:rules`
4. Verify customer, supplier and staff access.
5. Review denied requests and application logs.
6. Roll back to the previous ruleset from Firebase Console if required.

## Required production controls

- Enable Firebase App Check for Firestore.
- Use separate Firebase projects for local, preview and production.
- Protect the Git `main` branch and require CI.
- Never authorize from UI state alone.
- Never trust a role supplied in JSON, query parameters or headers.
- Never allow clients to write payment, invoice, inventory movement or audit data.
- Check revoked tokens for privileged server operations.
- Keep service-account permissions at the minimum required level.