"use client";

import Link from "next/link";
import { Menu, ShieldCheck, ShoppingBag, Store, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart-store";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const count = useCartStore((state) =>
    state.lines.reduce((sum, line) => sum + line.quantity, 0)
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="section-shell flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-forest text-white shadow-sm">
            <Store size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-xl font-bold leading-none text-forest">Duka</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
              Shop local
            </span>
          </span>
        </Link>

        <button
          type="button"
          className="btn-ghost md:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav
          className={`${
            menuOpen ? "flex" : "hidden"
          } absolute left-4 right-4 top-[80px] flex-col gap-1 rounded-lg border border-line bg-white p-3 shadow-xl md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
        >
          <Link href="/#products" className="btn-ghost" onClick={() => setMenuOpen(false)}>
            Shop
          </Link>
          <Link
            href="/admin/login"
            className="btn-ghost gap-2"
            onClick={() => setMenuOpen(false)}
          >
            <ShieldCheck size={17} /> Admin
          </Link>
          <Link
            href="/cart"
            className="relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white transition hover:bg-forest-light"
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingBag size={18} /> Cart
            {count > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-marigold px-1 text-xs font-bold text-ink">
                {count}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
