import type { Product } from "@/lib/types";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://duka-ecommerce-one.vercel.app"
).replace(/\/$/, "");

function absoluteUrl(value: string): string {
  if (!value) {
    return `${siteUrl}/images/duka-broilers-hero.jpg`;
  }

  try {
    return new URL(value).toString();
  } catch {
    return new URL(value.startsWith("/") ? value : `/${value}`, siteUrl).toString();
  }
}

export default function ProductJsonLd({
  product,
}: {
  product: Product;
}): React.ReactElement {
  const productUrl = `${siteUrl}/product/${product.id}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    description: product.description,
    image: [absoluteUrl(product.imageUrl)],
    sku: product.id,
    category: product.category || "Wholesale broiler chicken",
    brand: {
      "@type": "Brand",
      name: "Duka Broilers",
    },
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "KES",
      price: product.price.toFixed(2),
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "Duka Broilers",
      },
    },
  };

  const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
