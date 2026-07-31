import type { MetadataRoute } from "next";

import { getPublicProducts } from "@/lib/server/public-products";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://duka-ecommerce-one.vercel.app"
).replace(/\/$/, "");

export const revalidate = 300;

function absoluteImageUrl(value: string): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return new URL(value.startsWith("/") ? value : `/${value}`, siteUrl).toString();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/shop`,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  try {
    const products = await getPublicProducts();
    const productRoutes: MetadataRoute.Sitemap = products.map((product) => {
      const image = absoluteImageUrl(product.imageUrl);
      const route: MetadataRoute.Sitemap[number] = {
        url: `${siteUrl}/product/${product.id}`,
        changeFrequency: "daily",
        priority: 0.8,
      };

      if (product.updatedAt > 0) {
        route.lastModified = new Date(product.updatedAt);
      }

      if (image) {
        route.images = [image];
      }

      return route;
    });

    return [...staticRoutes, ...productRoutes];
  } catch (error) {
    console.error("Product sitemap generation failed:", error);
    return staticRoutes;
  }
}
