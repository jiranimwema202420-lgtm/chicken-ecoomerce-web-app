import type { Metadata } from "next";
import { notFound } from "next/navigation";

import ProductJsonLd from "@/components/seo/ProductJsonLd";
import { getPublicProduct } from "@/lib/server/public-products";

import ProductDetailsClient from "./ProductDetailsClient";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function metadataDescription(description: string): string {
  const normalized = description.replace(/\s+/g, " ").trim();

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157).trimEnd()}...`;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getPublicProduct(id);

  if (!product) {
    return {
      title: "Product unavailable",
      description: "This Duka Broilers product is no longer available.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const canonical = `/product/${product.id}`;
  const description = metadataDescription(product.description);
  const image = product.imageUrl || "/images/duka-broilers-hero.jpg";

  return {
    title: product.name,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${product.name} | Duka Broilers`,
      description,
      images: [
        {
          url: image,
          alt: product.name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Duka Broilers`,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function ProductPage({
  params,
}: ProductPageProps): Promise<React.ReactElement> {
  const { id } = await params;
  const product = await getPublicProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductJsonLd product={product} />
      <ProductDetailsClient initialProduct={product} />
    </>
  );
}
