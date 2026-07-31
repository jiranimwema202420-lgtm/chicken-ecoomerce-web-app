const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://duka-ecommerce-one.vercel.app"
).replace(/\/$/, "");

export default function OrganizationJsonLd(): React.ReactElement {
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Duka Broilers",
        url: siteUrl,
        logo: `${siteUrl}/apple-touch-icon.png`,
        image: `${siteUrl}/images/duka-broilers-hero.jpg`,
        description:
          "Fresh wholesale broiler chicken supplier serving hotels, restaurants, supermarkets, vendors and institutions across Kenya.",
        areaServed: {
          "@type": "Country",
          name: "Kenya",
        },
        knowsAbout: [
          "Wholesale broiler chicken",
          "Fresh chicken supply",
          "Poultry distribution",
          "Restaurant food supply",
          "Hotel food supply",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "Duka Broilers",
        inLanguage: "en-KE",
        publisher: {
          "@id": `${siteUrl}/#organization`,
        },
      },
    ],
  };

  const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd }}
    />
  );
}
