"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_WINDOW_MS = 5 * 60 * 1000;
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;
const SESSION_KEY = "duka:session:v1";

type SessionRecord = {
  uid: string;
  startedAt: number;
  lastActivityAt: number;
};

function readSession(): SessionRecord | null {
  try {
    const value = window.localStorage.getItem(SESSION_KEY);
    if (!value) return null;

    const parsed = JSON.parse(value) as Partial<SessionRecord>;
    if (
      typeof parsed.uid !== "string" ||
      typeof parsed.startedAt !== "number" ||
      typeof parsed.lastActivityAt !== "number"
    ) {
      return null;
    }

    return parsed as SessionRecord;
  } catch {
    return null;
  }
}

function writeSession(record: SessionRecord): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(record));
}

function remainingTime(record: SessionRecord, now: number): number {
  const idleRemaining = record.lastActivityAt + IDLE_TIMEOUT_MS - now;
  const absoluteRemaining = record.startedAt + ABSOLUTE_TIMEOUT_MS - now;
  return Math.min(idleRemaining, absoluteRemaining);
}

function isAbsoluteLimit(record: SessionRecord): boolean {
  return (
    record.startedAt + ABSOLUTE_TIMEOUT_MS <=
    record.lastActivityAt + IDLE_TIMEOUT_MS
  );
}

export default function SessionTimeout(): React.ReactElement | null {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const [absoluteLimit, setAbsoluteLimit] = useState(false);
  const expiringRef = useRef(false);
  const lastActivityWriteRef = useRef(0);

  const expireSession = useCallback(async () => {
    if (expiringRef.current) return;
    expiringRef.current = true;

    window.localStorage.removeItem(SESSION_KEY);

    try {
      await signOut(auth);
    } finally {
      router.replace("/login?reason=session-expired");
      setRemainingMs(null);
      setAbsoluteLimit(false);
      expiringRef.current = false;
    }
  }, [router]);

  const recordActivity = useCallback(() => {
    if (!user || user.isAnonymous || expiringRef.current) return;

    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_WRITE_INTERVAL_MS) {
      return;
    }

    const current = readSession();
    if (!current || current.uid !== user.uid) return;

    const next = { ...current, lastActivityAt: now };
    writeSession(next);
    lastActivityWriteRef.current = now;
    setRemainingMs(remainingTime(next, now));
    setAbsoluteLimit(isAbsoluteLimit(next));
  }, [user]);

  useEffect(() => {
    if (loading) return;

    if (!user || user.isAnonymous) {
      window.localStorage.removeItem(SESSION_KEY);
      setRemainingMs(null);
      setAbsoluteLimit(false);
      return;
    }

    const now = Date.now();
    const current = readSession();
    const session =
      current && current.uid === user.uid
        ? current
        : { uid: user.uid, startedAt: now, lastActivityAt: now };

    if (remainingTime(session, now) <= 0) {
      void expireSession();
      return;
    }

    writeSession(session);
    lastActivityWriteRef.current = session.lastActivityAt;

    const checkTimeout = () => {
      const latest = readSession();
      if (!latest || latest.uid !== user.uid) {
        void expireSession();
        return;
      }

      const remaining = remainingTime(latest, Date.now());
      setRemainingMs(remaining);
      setAbsoluteLimit(isAbsoluteLimit(latest));

      if (remaining <= 0) void expireSession();
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_KEY) return;
      if (!event.newValue) {
        void expireSession();
        return;
      }
      checkTimeout();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkTimeout();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "scroll",
      "touchstart",
    ];

    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, recordActivity, { passive: true }),
    );
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const interval = window.setInterval(checkTimeout, 10_000);
    checkTimeout();

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, recordActivity),
      );
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [expireSession, loading, recordActivity, user]);

  if (
    !user ||
    user.isAnonymous ||
    remainingMs === null ||
    remainingMs > WARNING_WINDOW_MS
  ) {
    return null;
  }

  const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <section
        aria-describedby="session-timeout-description"
        aria-labelledby="session-timeout-title"
        aria-live="assertive"
        className="w-full max-w-md rounded-2xl border border-line bg-white p-6 text-ink shadow-2xl dark:bg-[#102419] dark:text-white sm:p-8"
        role="alertdialog"
      >
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
          Session security
        </p>
        <h2
          id="session-timeout-title"
          className="mt-2 font-display text-2xl font-bold"
        >
          Your session will expire soon
        </h2>
        <p
          id="session-timeout-description"
          className="mt-3 text-sm leading-6 text-ink/70 dark:text-white/75"
        >
          {absoluteLimit
            ? `For your protection, the maximum session duration ends in approximately ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}. You will need to sign in again.`
            : `For your protection, you will be signed out in approximately ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} unless you continue the session.`}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => void expireSession()}
            className="min-h-11 rounded-lg border border-line px-5 py-2.5 text-sm font-bold transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            Sign out now
          </button>
          {absoluteLimit ? (
            <button
              type="button"
              autoFocus
              onClick={() => void expireSession()}
              className="min-h-11 rounded-lg bg-forest px-5 py-2.5 text-sm font-bold text-white transition hover:bg-forest-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              Sign in again
            </button>
          ) : (
            <button
              type="button"
              autoFocus
              onClick={recordActivity}
              className="min-h-11 rounded-lg bg-forest px-5 py-2.5 text-sm font-bold text-white transition hover:bg-forest-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            >
              Continue session
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
