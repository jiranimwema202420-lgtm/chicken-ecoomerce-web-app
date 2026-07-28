"use client";

import Link from "next/link";
import {
  Handshake,
  LogIn,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, isAdmin, isSupplier, loading } = useAuth();

  const count = useCartStore((state) =>
    state.lines.reduce((sum, line) => sum + line.quantity, 0)
  );

  const closeMenu = () => setMenuOpen(false);
  const isCustomer = Boolean(user && !user.isAnonymous);

  return (
    <header className="glass-navbar sticky top-0 z-40">
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
          } glass-mobile-menu absolute left-4 right-4 top-[80px] flex-col gap-1 rounded-2xl p-3 md:static md:flex md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none`}
        >
          <Link href="/shop#products" className="btn-ghost" onClick={closeMenu}>
            Shop
          </Link>

          {!loading && isCustomer && (
            <Link href="/account" className="btn-ghost gap-2" onClick={closeMenu}>
              <UserRound size={17} /> My account
            </Link>
          )}

          {!loading && !isSupplier && (
            <Link href="/supplier/login" className="btn-ghost gap-2" onClick={closeMenu}>
              <Handshake size={17} /> Supplier sign in
            </Link>
          )}

          {!loading && isSupplier && (
            <Link href="/supplier" className="btn-ghost gap-2" onClick={closeMenu}>
              <Handshake size={17} /> Supplier portal
            </Link>
          )}

          {!loading && (!user || user.isAnonymous) && (
            <>
              <Link href="/#customer-login" className="btn-ghost gap-2" onClick={closeMenu}>
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

          <Link href="/cart" className="btn-primary relative gap-2 px-4" onClick={closeMenu}>
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