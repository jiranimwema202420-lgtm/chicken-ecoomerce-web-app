import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let app: App | undefined;

/** Lazily builds the Admin app on first use, not at module import time —
 * keeps `next build` working even before secrets are configured. */
function getAdminApp(): App {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0];
    return app;
  }

  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Vercel env vars store literal "\n" — convert back to real newlines.
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
  return app;
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

// Convenience proxies so call sites can keep writing `adminDb.collection(...)`
// without invoking a function first. Each property access lazily resolves
// the real Firestore/Auth instance.
export const adminDb = new Proxy({} as Firestore, {
  get(_target, prop) {
    const instance = getAdminDb() as unknown as Record<string, unknown>;
    const value = instance[prop as string];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getAdminAuth() as unknown as Record<string, unknown>;
    const value = instance[prop as string];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
