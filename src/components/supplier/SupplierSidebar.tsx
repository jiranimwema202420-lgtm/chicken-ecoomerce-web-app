"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Store,
  Star,
} from "lucide-react";
import { auth } from "@/lib/firebase";

const links = [
  {
    href: "/supplier",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/supplier/requests/new",
    label: "New supply request",
    icon: PlusCircle,
    exact: false,
  },
  { href: "/supplier/featured-listings", label: "Featured listings", icon: Star, exact: false },
];

export default function SupplierSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-full shrink-0 lg:w-60">
      <nav className="card flex gap-1 overflow-x-auto p-2 lg:sticky lg:top-24 lg:flex-col">
        <div className="hidden px-3 pb-3 pt-2 lg:block">
          <div className="flex items-center gap-2 text-forest">
            <ClipboardList size={18} />
            <span className="font-display font-bold">Supplier portal</span>
          </div>
        </div>

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

        <Link
          href="/"
          className="flex min-w-fit items-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-ink/65 transition hover:bg-white/55 hover:text-forest lg:mt-2"
        >
          <Store size={17} /> Storefront
        </Link>

        <button
          type="button"
          onClick={async () => {
            await signOut(auth);
            router.replace("/supplier/login");
          }}
          className="flex min-w-fit items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50/80"
        >
          <LogOut size={17} /> Sign out
        </button>
      </nav>
    </aside>
  );
}
