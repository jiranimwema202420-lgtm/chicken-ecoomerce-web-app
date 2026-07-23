"use client";

import { usePathname } from "next/navigation";
import RequireAdmin from "@/components/admin/RequireAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <>{children}</>;

  return (
    <RequireAdmin>
      <div className="section-shell flex flex-col gap-6 py-8 lg:flex-row lg:items-start lg:py-10">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RequireAdmin>
  );
}
