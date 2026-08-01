"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Handshake,
  LogIn,
  Menu,
  ShieldCheck,
  Settings,
  ShoppingBag,
  Store,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/lib/auth-context";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const { user, isAdmin, isSupplier, loading } = useAuth();

  const count = useCartStore((state) =>
    state.lines.reduce((sum, line) => sum + line.quantity, 0)
  );

  const closeMenu = () => setMenuOpen(false);
  const isCustomer = Boolean(user && !user.isAnonymous);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  function current(path: string): "page" | undefined {
    return pathname === path || pathname.startsWith(`${path}/`)
      ? "page"
      : undefined;
  }

  return (
    <header className="glass-navbar sticky top-0 z-40" aria-label="Site header">
      <div className="section-shell flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2" onClick={closeMenu}>
          <span className="glass-brand-mark grid h-10 w-10 place-items-center rounded-xl text-white">
            <Store size={21} aria-hidden="true" />
          </span>
          <span>
            <span className="block font-display text-xl font-bold leading-none text-forest">
              Duka
            </span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
              Wholesale broilers
            </span>
          </span>
        </Link>

        <button
          ref={menuButtonRef}
          type="button"
          className="btn-ghost gap-2 lg:hidden"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
          <span className="text-sm">Menu</span>
        </button>

        <nav
          id="primary-navigation"
          aria-label="Primary navigation"
          className={`${
            menuOpen ? "flex" : "hidden"
          } glass-mobile-menu absolute left-4 right-4 top-[80px] max-h-[calc(100vh-96px)] flex-col gap-1 overflow-y-auto rounded-2xl p-3 lg:static lg:flex lg:max-h-none lg:flex-row lg:items-center lg:gap-1 lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none`}
        >
          <Link href="/shop#products" className="btn-ghost" aria-current={current("/shop")} onClick={closeMenu}>
            Shop
          </Link>

          {!loading && isCustomer && (
            <Link href="/account" className="btn-ghost gap-2" aria-current={current("/account")} onClick={closeMenu}>
              <UserRound size={17} /> My account
            </Link>
          )}

          {!loading && !isSupplier && (
            <Link href="/supplier/login" className="btn-ghost gap-2" onClick={closeMenu}>
              <Handshake size={17} />
              <span className="lg:hidden xl:inline">Supplier sign in</span>
            </Link>
          )}

          {!loading && isSupplier && (
            <Link href="/supplier" className="btn-ghost gap-2" onClick={closeMenu}>
              <Handshake size={17} /> Supplier portal
            </Link>
          )}

          {!loading && (!user || user.isAnonymous) && (
            <>
              <Link href="/login" className="btn-ghost gap-2" onClick={closeMenu}>
                <LogIn size={17} /> Sign in
              </Link>
              <Link href="/register" className="btn-secondary gap-2" onClick={closeMenu}>
                <UserPlus size={17} /> Register
              </Link>
            </>
          )}

          {!loading && isAdmin && (
            <Link href="/admin" className="btn-ghost gap-2" onClick={closeMenu}>
              <ShieldCheck size={17} /> Admin
            </Link>
          )}

          <div className="flex items-center gap-1 border-t border-line pt-2 lg:border-0 lg:pt-0">
            <Link
              href="/settings"
              className="btn-ghost gap-2"
              onClick={closeMenu}
              aria-label="Open settings"
            >
              <Settings size={18} />
              <span className="lg:hidden xl:inline">Settings</span>
            </Link>
            <ThemeToggle />
          </div>

          <Link href="/cart" className="btn-primary relative gap-2 px-4" aria-current={current("/cart")} onClick={closeMenu}>
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
