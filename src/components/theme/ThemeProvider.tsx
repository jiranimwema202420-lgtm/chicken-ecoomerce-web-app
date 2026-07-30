"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (value: ThemePreference) => void;
  toggleTheme: () => void;
  mounted: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "duka-theme-preference";

function systemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ResolvedTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  const resolve = useCallback(
    (value: ThemePreference): ResolvedTheme =>
      value === "system" ? systemTheme() : value,
    []
  );

  const setPreference = useCallback(
    (value: ThemePreference) => {
      const next = resolve(value);
      setPreferenceState(value);
      setResolvedTheme(next);
      localStorage.setItem(STORAGE_KEY, value);
      applyTheme(next);
    },
    [resolve]
  );

  const toggleTheme = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial: ThemePreference =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";

    const next = resolve(initial);
    setPreferenceState(initial);
    setResolvedTheme(next);
    applyTheme(next);
    setMounted(true);
  }, [resolve]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (preference !== "system") return;
      const next = media.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyTheme(next);
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  const value = useMemo(
    () => ({
      preference,
      resolvedTheme,
      setPreference,
      toggleTheme,
      mounted,
    }),
    [mounted, preference, resolvedTheme, setPreference, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider.");
  return context;
}