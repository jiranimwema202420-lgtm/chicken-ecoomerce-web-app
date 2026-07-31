import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Duka Broilers Wholesale",
    short_name: "Duka Broilers",
    description:
      "Order fresh wholesale broiler chicken for businesses and institutions across Kenya.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#f7faf7",
    theme_color: "#1f5d3b",
    orientation: "portrait-primary",
    lang: "en-KE",
    categories: ["business", "food", "shopping"],
    icons: [
      { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Shop", short_name: "Shop", url: "/shop?source=pwa-shortcut" },
      { name: "Cart", short_name: "Cart", url: "/cart?source=pwa-shortcut" },
    ],
  };
}
