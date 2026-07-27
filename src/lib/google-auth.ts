import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth } from "@/lib/firebase";

/**
 * Uses one Google flow for both registration and sign-in.
 *
 * Duka previously attempted to link a temporary anonymous user to Google.
 * Firebase rejects that operation when the selected Google account already
 * belongs to an existing Firebase user. To avoid the collision, discard the
 * temporary anonymous session before starting the normal Google sign-in.
 */
export async function signInOrLinkWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  if (auth.currentUser?.isAnonymous) {
    await signOut(auth);
  }

  return signInWithPopup(auth, provider);
}