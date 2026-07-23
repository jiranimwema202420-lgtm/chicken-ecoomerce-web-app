import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const environmentConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(environmentConfig).every(
  (value) => typeof value === "string" && value.trim().length > 0
);

// Firebase Auth throws at module initialization when apiKey is blank. A local
// placeholder keeps builds and the setup screen functional; no reads or writes
// are attempted while isFirebaseConfigured is false.
const firebaseConfig = isFirebaseConfigured
  ? environmentConfig
  : {
      apiKey: "duka-local-placeholder-key",
      authDomain: "duka-local-placeholder.firebaseapp.com",
      projectId: "duka-local-placeholder",
      storageBucket: "duka-local-placeholder.appspot.com",
      messagingSenderId: "000000000000",
      appId: "1:000000000000:web:0000000000000000000000",
    };

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
