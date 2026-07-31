"use client";

import { useEffect } from "react";

export default function PwaRegistration(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let cancelled = false;
    const register = async (): Promise<void> => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (!cancelled) await registration.update();
      } catch (error) {
        console.error("PWA service worker registration failed.", error);
      }
    };

    const onLoad = (): void => { void register(); };
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
