import "dotenv/config";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const allowedRoles = new Set([
  "admin",
  "operations",
  "order_manager",
  "inventory_manager",
  "finance",
  "accountant",
  "support",
  "supplier",
  "customer",
]);

const identifier = process.argv[2];
const role = process.argv[3];

if (!identifier || !role || !allowedRoles.has(role)) {
  console.error(
    "Usage: node scripts/set-user-role.mjs <email-or-uid> <role>"
  );
  console.error(`Allowed roles: ${[...allowedRoles].join(", ")}`);
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Firebase Admin environment variables are missing.");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const auth = getAuth();

const user = identifier.includes("@")
  ? await auth.getUserByEmail(identifier)
  : await auth.getUser(identifier);

const existing = user.customClaims ?? {};

await auth.setCustomUserClaims(user.uid, {
  ...existing,
  role,
  admin: role === "admin",
  supplier: role === "supplier",
});

console.log(`Role '${role}' assigned to ${user.email ?? user.uid}.`);
console.log("The user must sign in again or refresh their ID token.");