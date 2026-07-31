import type { Metadata, Viewport } from "next";
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
        <PwaRegistration />
        <ThemeProvider>
          <AuthProvider>
            <InventorySyncProvider>
              <Navbar />

              <main className="min-h-[calc(100vh-72px)]">
                {children}
              </main>

              <footer className="glass-footer border-t">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                  <p>
                    © {new Date().getFullYear()} Duka Broilers. Wholesale
                    fresh chicken for business.
                  </p>

                  <p>Wholesale prices are shown in Kenyan shillings.</p>
                </div>
              </footer>
            </InventorySyncProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
