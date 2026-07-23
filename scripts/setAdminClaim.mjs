/**
 * Run once per admin user:
 *   node scripts/setAdminClaim.mjs admin@example.com
 *
 * Requires FIREBASE_ADMIN_* variables in .env.local.
 */
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

dotenv.config({ path: ".env.local" });

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: node scripts/setAdminClaim.mjs <email>");
  process.exit(1);
}

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are required.");
  process.exit(1);
}

const app =
  getApps()[0] ??
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

try {
  const auth = getAuth(app);
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { admin: true });
  console.log(`Granted admin claim to ${email} (uid: ${user.uid}).`);
  console.log("The user must sign out and back in for the claim to take effect.");
} catch (error) {
  console.error(error);
  process.exit(1);
}
