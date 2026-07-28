import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/lib/auth-context";
import InventorySyncProvider from "@/components/InventorySyncProvider";

export const metadata: Metadata = {
  title: {
    default: "Duka | Shop with M-Pesa",
    template: "%s | Duka",
  },
  description:
    "A modern Kenyan online store with secure M-Pesa checkout and Firebase-powered product management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <InventorySyncProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-72px)]">{children}</main>
          <footer className="glass-footer border-t">
            <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
              <p>Ã‚Â© {new Date().getFullYear()} Duka. Built for fast, secure shopping.</p>
              <p>Prices are shown in Kenyan shillings.</p>
            </div>
          </footer>
                  </InventorySyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
