import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

import Navbar from "@/components/Navbar";
import PwaRegistration from "@/components/pwa/PwaRegistration";
import InventorySyncProvider from "@/components/InventorySyncProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ThemeScript from "@/components/theme/ThemeScript";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      "https://duka-ecommerce-one.vercel.app"
  ),

  title: {
    default: "Duka Broilers | Fresh Wholesale Chicken in Kenya",
    template: "%s | Duka Broilers",
  },

  description:
    "Order fresh wholesale broiler chicken for hotels, restaurants, supermarkets, caterers, vendors and institutions across Kenya.",

  keywords: [
    "wholesale chicken Kenya",
    "fresh broiler chicken",
    "broiler suppliers Kenya",
    "chicken suppliers Nairobi",
    "bulk chicken Kenya",
    "poultry supplier Kenya",
    "restaurant chicken supplier",
    "hotel chicken supplier",
    "Duka Broilers",
  ],

  authors: [
    {
      name: "Duka Broilers",
    },
  ],

  creator: "Duka Broilers",
  publisher: "Duka Broilers",
  applicationName: "Duka Broilers",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Duka Broilers",
  },
  category: "Food and Beverage",


  openGraph: {
    type: "website",
    locale: "en_KE",
    siteName: "Duka Broilers",
    title: "Duka Broilers | Fresh Wholesale Chicken in Kenya",
    description:
      "Reliable fresh broiler chicken supply for businesses and institutions across Kenya.",
    images: [
      {
        url: "/images/duka-broilers-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Fresh broiler chickens supplied by Duka Broilers",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Duka Broilers | Fresh Wholesale Chicken in Kenya",
    description:
      "Fresh wholesale broiler chicken for hotels, restaurants, supermarkets and institutions across Kenya.",
    images: ["/images/duka-broilers-hero.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },

  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  other: {
    "geo.region": "KE",
    "geo.placename": "Kenya",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf7" },
    { media: "(prefers-color-scheme: dark)", color: "#102419" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};
type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default function RootLayout({
  children,
}: RootLayoutProps): React.ReactElement {
  return (
    <html lang="en-KE" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>

      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <PwaRegistration />
        <ThemeProvider>
          <AuthProvider>
            <InventorySyncProvider>
              <Navbar />

              <main
                id="main-content"
                tabIndex={-1}
                className="min-h-[calc(100vh-72px)] outline-none"
              >
                {children}
              </main>

              <footer className="glass-footer border-t">
                <div className="section-shell grid gap-8 py-9 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className="font-display text-lg font-bold text-forest">
                      Duka Broilers
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
                      Fresh wholesale chicken for hotels, restaurants,
                      retailers and institutions. Prices are shown in Kenyan
                      shillings.
                    </p>
                  </div>

                  <nav
                    aria-label="Footer navigation"
                    className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold"
                  >
                    <Link href="/shop" className="footer-link">Shop</Link>
                    <Link href="/cart" className="footer-link">Cart</Link>
                    <Link href="/account" className="footer-link">Account</Link>
                    <Link href="/settings" className="footer-link">Settings</Link>
                  </nav>

                  <p className="border-t border-line pt-5 text-xs text-ink/50 sm:col-span-2">
                    © {new Date().getFullYear()} Duka Broilers. All rights
                    reserved.
                  </p>
                </div>
              </footer>
            </InventorySyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
