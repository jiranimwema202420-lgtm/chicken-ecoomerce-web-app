"use client";

import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  User,
  browserLocalPersistence,
  onIdTokenChanged,
  setPersistence,
} from "firebase/auth";
import posthog from "posthog-js";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  isGuest: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isGuest: false,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    void setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Could not enable persistent Firebase auth:", error);
    });

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!active) return;
      setUser(firebaseUser);

      if (firebaseUser && !firebaseUser.isAnonymous) {
        posthog.identify(firebaseUser.uid, {
          name: firebaseUser.displayName ?? undefined,
          email: firebaseUser.email ?? undefined,
        });
      }

      try {
        if (firebaseUser) {
          const tokenResult = await firebaseUser.getIdTokenResult();
          if (active) setIsAdmin(tokenResult.claims.admin === true);
        } else if (active) {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Could not read Firebase auth claims:", error);
        if (active) setIsAdmin(false);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin,
      isGuest: user?.isAnonymous === true,
      loading,
    }),
    [user, isAdmin, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
