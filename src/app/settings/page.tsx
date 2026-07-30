"use client";

import Link from "next/link";
import { Check, Laptop, Moon, Settings, Sun } from "lucide-react";
import {
  type ThemePreference,
  useTheme,
} from "@/components/theme/ThemeProvider";

const options: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: "light",
    title: "Light",
    description: "Use the bright Duka interface.",
    icon: Sun,
  },
  {
    value: "dark",
    title: "Dark",
    description: "Use a lower-glare dark interface.",
    icon: Moon,
  },
  {
    value: "system",
    title: "System",
    description: "Follow your device appearance.",
    icon: Laptop,
  },
];

export default function SettingsPage() {
  const { preference, resolvedTheme, setPreference, mounted } = useTheme();

  return (
    <section className="section-shell py-10 sm:py-14">
      <p className="eyebrow">Preferences</p>
      <h1 className="mt-2 flex items-center gap-3 font-display text-3xl font-bold sm:text-4xl">
        <Settings className="text-forest" />
        App settings
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/60">
        Choose how Duka Broilers looks on this device.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="settings-card">
          <h2 className="font-display text-xl font-bold">Appearance</h2>
          <p className="mt-1 text-sm text-ink/55">
            Your choice is saved locally in this browser.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {options.map(({ value, title, description, icon: Icon }) => {
              const selected = mounted && preference === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPreference(value)}
                  className={`theme-option ${
                    selected ? "theme-option-selected" : ""
                  }`}
                  aria-pressed={selected}
                >
                  <span className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-forest/10 text-forest">
                      <Icon size={20} />
                    </span>
                    {selected && (
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-forest text-white">
                        <Check size={14} />
                      </span>
                    )}
                  </span>
                  <span className="mt-4 block text-left font-bold">
                    {title}
                  </span>
                  <span className="mt-1 block text-left text-xs leading-5 text-ink/55">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="settings-card h-fit">
          <h2 className="font-display text-lg font-bold">Summary</h2>
          <dl className="mt-5 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">Preference</dt>
              <dd className="font-bold capitalize">
                {mounted ? preference : "Loading"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink/55">Active theme</dt>
              <dd className="font-bold capitalize">
                {mounted ? resolvedTheme : "Loading"}
              </dd>
            </div>
          </dl>

          <Link href="/shop" className="btn-primary mt-7 w-full">
            Return to shop
          </Link>
        </aside>
      </div>
    </section>
  );
}