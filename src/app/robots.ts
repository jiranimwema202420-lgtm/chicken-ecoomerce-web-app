import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://duka-ecommerce-one.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/products"],
        disallow: [
          "/admin/",
          "/account/",
          "/checkout/",
          "/cart/",
          "/orders/",
          "/supplier/",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}

