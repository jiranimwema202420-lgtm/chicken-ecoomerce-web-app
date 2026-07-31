import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wholesale Broiler Chicken Products",
  description:
    "Browse fresh wholesale broiler chickens available for hotels, restaurants, supermarkets and institutions across Kenya.",
  alternates: {
    canonical: "/shop",
  },
  openGraph: {
    type: "website",
    url: "/shop",
    title: "Wholesale Broiler Chicken Products | Duka Broilers",
    description:
      "Browse current wholesale chicken stock and prices from Duka Broilers.",
    images: [
      {
        url: "/images/duka-broilers-hero.jpg",
        width: 1200,
        height: 630,
        alt: "Fresh wholesale broiler chickens from Duka Broilers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wholesale Broiler Chicken Products | Duka Broilers",
    description:
      "Browse current wholesale chicken stock and prices from Duka Broilers.",
    images: ["/images/duka-broilers-hero.jpg"],
  },
};

export default function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return <>{children}</>;
}
