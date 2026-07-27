"use client";

import { usePathname } from "next/navigation";
import RequireSupplier from "@/components/supplier/RequireSupplier";
import SupplierSidebar from "@/components/supplier/SupplierSidebar";

export default function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/supplier/login";

  if (isLoginPage) return <>{children}</>;

  return (
    <RequireSupplier>
      <div className="section-shell flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:py-10">
        <SupplierSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RequireSupplier>
  );
}