"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  Handshake,
  BadgeDollarSign,
  BadgeCheck,
  LayoutGrid,
  LogOut,
  Package,
  Truck,
  UsersRound,
} from "lucide-react";
import { auth } from "@/lib/firebase";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid, exact: true },
  {
    href: "/admin/products",
    label: "Products",
    icon: Package,
    exact: false,
  },
  {
    href: "/admin/revenue",
    label: "Revenue",
    icon: BadgeDollarSign,
    exact: false,
  },
  {
    href: "/admin/memberships",
    label: "Memberships",
    icon: BadgeCheck,
    exact: false,
  },
  {
    href: "/admin/customers",
    label: "Customers",
    icon: UsersRound,
    exact: false,
  },  {
    href: "/admin/suppliers",
    label: "Suppliers",
    icon: Handshake,
    exact: false,
  },
  {
    href: "/admin/pay-on-delivery",
    label: "Pay on delivery",
    icon: Truck,
    exact: false,
  },];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-full shrink-0 lg:w-52">
      <nav className="card flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-24 lg:flex-col">
        {links.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-forest text-white"
                  : "text-ink/65 hover:bg-white/55 hover:text-forest"
              }`}
            >
              <Icon size={17} /> {label}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            router.replace("/admin/login");
          }}
          className="flex min-w-fit items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50/80 lg:mt-2"
        >
          <LogOut size={17} /> Sign out
        </button>
      </nav>
    </aside>
  );
}
