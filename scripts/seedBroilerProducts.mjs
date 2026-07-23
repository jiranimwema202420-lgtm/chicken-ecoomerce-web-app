/**
 * Adds broiler chicken products without removing the existing catalogue.
 * Run: npm run seed:broilers
 *
 * Prices are starter KES values. Review them in the admin dashboard before
 * accepting production orders.
 */
import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

dotenv.config({ path: ".env.local" });

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error(
    "FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY are required in .env.local."
  );
  process.exit(1);
}

const app =
  getApps()[0] ??
  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore(app);
const now = Date.now();

const broilerProducts = [
  {
    id: "whole-broiler-small",
    name: "Whole Broiler Chicken — Small",
    description:
      "Fresh dressed whole broiler weighing approximately 1.0–1.2 kg. Ideal for two to three servings.",
    price: 550,
    category: "Whole Broilers",
    stock: 25,
    imageUrl: "/products/whole-broiler-small.svg",
  },
  {
    id: "whole-broiler-medium",
    name: "Whole Broiler Chicken — Medium",
    description:
      "Fresh dressed whole broiler weighing approximately 1.3–1.5 kg. A practical family-size bird.",
    price: 700,
    category: "Whole Broilers",
    stock: 30,
    imageUrl: "/products/whole-broiler-medium.svg",
  },
  {
    id: "whole-broiler-large",
    name: "Whole Broiler Chicken — Large",
    description:
      "Fresh dressed whole broiler weighing approximately 1.6–1.8 kg for family meals and roasting.",
    price: 850,
    category: "Whole Broilers",
    stock: 20,
    imageUrl: "/products/whole-broiler-large.svg",
  },
  {
    id: "whole-broiler-extra-large",
    name: "Whole Broiler Chicken — Extra Large",
    description:
      "Fresh dressed whole broiler weighing approximately 1.9–2.2 kg. Best for larger households or entertaining.",
    price: 1050,
    category: "Whole Broilers",
    stock: 15,
    imageUrl: "/products/whole-broiler-extra-large.svg",
  },
  {
    id: "broiler-breast-fillet-1kg",
    name: "Boneless Broiler Breast Fillet — 1 kg",
    description:
      "Skinless, boneless broiler breast fillets prepared for grilling, pan-frying, curries, and meal prep.",
    price: 1000,
    category: "Chicken Cuts",
    stock: 18,
    imageUrl: "/products/broiler-breast-fillet.svg",
  },
  {
    id: "broiler-thighs-1kg",
    name: "Broiler Chicken Thighs — 1 kg",
    description:
      "Tender bone-in chicken thighs with rich flavour, packed in a convenient one-kilogram portion.",
    price: 800,
    category: "Chicken Cuts",
    stock: 20,
    imageUrl: "/products/broiler-thighs.svg",
  },
  {
    id: "broiler-drumsticks-1kg",
    name: "Broiler Chicken Drumsticks — 1 kg",
    description:
      "Meaty broiler drumsticks suitable for roasting, frying, grilling, or stews.",
    price: 780,
    category: "Chicken Cuts",
    stock: 20,
    imageUrl: "/products/broiler-drumsticks.svg",
  },
  {
    id: "broiler-wings-1kg",
    name: "Broiler Chicken Wings — 1 kg",
    description:
      "Fresh broiler wings ready for marinating, grilling, frying, or oven baking.",
    price: 720,
    category: "Chicken Cuts",
    stock: 20,
    imageUrl: "/products/broiler-wings.svg",
  },
  {
    id: "broiler-leg-quarters-1kg",
    name: "Broiler Leg Quarters — 1 kg",
    description:
      "Juicy thigh-and-drumstick portions offering excellent value for family meals.",
    price: 750,
    category: "Chicken Cuts",
    stock: 18,
    imageUrl: "/products/broiler-leg-quarters.svg",
  },
  {
    id: "broiler-gizzards-500g",
    name: "Cleaned Broiler Gizzards — 500 g",
    description:
      "Cleaned and ready-to-cook broiler gizzards packed in a half-kilogram portion.",
    price: 300,
    category: "Chicken Offal",
    stock: 14,
    imageUrl: "/products/broiler-gizzards.svg",
  },
  {
    id: "broiler-liver-500g",
    name: "Fresh Broiler Liver — 500 g",
    description:
      "Fresh broiler liver packed in a half-kilogram portion for quick, flavourful meals.",
    price: 250,
    category: "Chicken Offal",
    stock: 14,
    imageUrl: "/products/broiler-liver.svg",
  },
  {
    id: "broiler-family-pack-3",
    name: "Broiler Family Pack — 3 Medium Birds",
    description:
      "Three fresh dressed medium broilers, approximately 1.3–1.5 kg each, bundled at a family-pack price.",
    price: 1950,
    category: "Broiler Value Packs",
    stock: 10,
    imageUrl: "/products/broiler-family-pack.svg",
  },
  {
    id: "broiler-event-pack-10",
    name: "Broiler Event Pack — 10 Medium Birds",
    description:
      "Ten fresh dressed medium broilers for events, catering, restaurants, and group purchases.",
    price: 6200,
    category: "Broiler Value Packs",
    stock: 6,
    imageUrl: "/products/broiler-event-pack.svg",
  },
];

const batch = db.batch();
broilerProducts.forEach((product, index) => {
  const { id, ...productData } = product;
  const ref = db.collection("products").doc(id);

  batch.set(
    ref,
    {
      ...productData,
      active: true,
      createdAt: now - index * 1000,
      updatedAt: now,
    },
    { merge: true }
  );
});

await batch.commit();
console.log(`Added or updated ${broilerProducts.length} broiler chicken products.`);
