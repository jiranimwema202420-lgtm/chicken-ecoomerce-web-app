import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

interface FirebaseServiceAccountJson {
  project_id?: unknown;
  client_email?: unknown;
  private_key?: unknown;
}

function loadServiceAccount(): ServiceAccount {
  const encoded =
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64?.trim();

  if (!encoded) {
    throw new Error(
      "Missing required environment variable: FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64"
    );
  }

  let parsed: FirebaseServiceAccountJson;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    parsed = JSON.parse(decoded) as FirebaseServiceAccountJson;
  } catch {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 is not valid base64 JSON."
    );
  }

  if (
    typeof parsed.project_id !== "string" ||
    typeof parsed.client_email !== "string" ||
    typeof parsed.private_key !== "string"
  ) {
    throw new Error(
      "Firebase service account must contain project_id, client_email, and private_key."
    );
  }

  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key,
  };
}

const serviceAccount = loadServiceAccount();

const adminApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId,
      });

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);