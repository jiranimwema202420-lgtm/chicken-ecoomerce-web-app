type OrganizationStructuredData = {
  "@context": "https://schema.org";
  "@type": "Organization";
  name: string;
  url: string;
  logo: string;
  image: string;
  description: string;
  areaServed: {
    "@type": "Country";
    name: string;
  };
  knowsAbout: string[];
};

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://duka-ecommerce-one.vercel.app";

const organizationStructuredData: OrganizationStructuredData = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Duka Broilers",
  url: siteUrl,
  logo: `${siteUrl}/favicon.ico`,
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
};

export default function OrganizationJsonLd(): React.ReactElement {
  const jsonLd = JSON.stringify(organizationStructuredData).replace(
    /</g,
    "\\u003c"
  );

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: jsonLd,
      }}
    />
  );
}

