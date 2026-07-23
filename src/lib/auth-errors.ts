import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "An account already exists for this email address.",
  "auth/invalid-credential": "The email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/missing-password": "Enter your password.",
  "auth/weak-password": "Use a password with at least six characters.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled before it finished.",
  "auth/popup-blocked": "Your browser blocked the Google sign-in window.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/credential-already-in-use":
    "This sign-in method is already linked to another account.",
  "auth/network-request-failed": "Check your internet connection and try again.",
  "auth/operation-not-allowed":
    "This sign-in method is not enabled in Firebase Authentication.",
  "auth/too-many-requests": "Too many attempts. Please wait and try again.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account was found for that email address.",
  "auth/requires-recent-login": "Please sign in again before changing this information.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError) {
    return messages[error.code] ?? "Authentication could not be completed. Please try again.";
  }

  return error instanceof Error
    ? error.message
    : "Authentication could not be completed. Please try again.";
}
