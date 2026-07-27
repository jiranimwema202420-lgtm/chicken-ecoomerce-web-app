import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use":
    "An account already exists for this email address.",
  "auth/invalid-credential":
    "The email or password is incorrect.",
  "auth/invalid-email":
    "Enter a valid email address.",
  "auth/missing-password":
    "Enter your password.",
  "auth/weak-password":
    "Use a password with at least six characters.",

  "auth/popup-closed-by-user":
    "Google sign-in was cancelled before it finished.",
  "auth/popup-blocked":
    "Your browser blocked the Google sign-in window. Allow pop-ups and try again.",
  "auth/cancelled-popup-request":
    "Another Google sign-in attempt was started. Close other sign-in windows and try again.",
  "auth/unauthorized-domain":
    "This website is not authorized for Google sign-in. Add the current domain in Firebase Authentication settings.",
  "auth/auth-domain-config-required":
    "Firebase Authentication is missing its authDomain configuration.",
  "auth/app-not-authorized":
    "This app is not authorized to use Firebase Authentication with the configured API key.",
  "auth/operation-not-supported-in-this-environment":
    "Google sign-in is not supported in this browser environment.",

  "auth/account-exists-with-different-credential":
    "An account already exists with this email using another sign-in method. Sign in with that method first.",
  "auth/credential-already-in-use":
    "This Google account is already connected to another Duka account. Use Sign in instead.",
  "auth/provider-already-linked":
    "Google sign-in is already linked to this account.",

  "auth/network-request-failed":
    "Check your internet connection and try again.",
  "auth/operation-not-allowed":
    "Google sign-in is not enabled in Firebase Authentication.",
  "auth/too-many-requests":
    "Too many attempts. Please wait and try again.",
  "auth/user-disabled":
    "This account has been disabled.",
  "auth/user-not-found":
    "No account was found for that email address.",
  "auth/requires-recent-login":
    "Please sign in again before changing this information.",

  "auth/invalid-api-key":
    "The Firebase API key is invalid.",
  "auth/invalid-app-id":
    "The Firebase application ID is invalid.",
  "auth/internal-error":
    "Firebase Authentication encountered an internal error. Please try again.",
};

interface FirebaseLikeError {
  code?: unknown;
  message?: unknown;
}

export function getAuthErrorCode(error: unknown): string {
  if (error instanceof FirebaseError) {
    return error.code;
  }

  if (typeof error === "object" && error !== null) {
    const candidate = error as FirebaseLikeError;

    if (typeof candidate.code === "string") {
      return candidate.code;
    }
  }

  return "auth/unknown";
}

export function getAuthErrorMessage(error: unknown): string {
  const code = getAuthErrorCode(error);

  if (process.env.NODE_ENV !== "production") {
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            typeof (error as FirebaseLikeError).message === "string"
          ? String((error as FirebaseLikeError).message)
          : "No Firebase error message was provided.";

    console.warn("[Firebase Auth]", code, rawMessage);
  }

  return (
    messages[code] ??
    "Authentication could not be completed. Please try again."
  );
}