/**
 * Seeds a small starter catalogue using Firebase Admin.
 * Run: npm run seed
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

const products = [
  {
    id: "signature-hoodie",
    name: "Signature Hoodie",
    description: "Heavyweight fleece hoodie designed for comfort and everyday wear.",
    price: 4200,
    category: "Apparel",
    stock: 20,
  },
  {
    id: "classic-logo-tshirt",
    name: "Classic Logo T-Shirt",
    description: "Premium cotton T-shirt with a clean, versatile fit.",
    price: 1800,
    category: "Apparel",
    stock: 35,
  },
  {
    id: "canvas-tote-bag",
    name: "Canvas Tote Bag",
    description: "Durable everyday tote with reinforced handles and generous storage.",
    price: 1400,
    category: "Accessories",
    stock: 25,
  },
  {
    id: "insulated-bottle",
    name: "Insulated Bottle",
    description: "Double-wall stainless-steel bottle that keeps drinks cold or hot.",
    price: 2300,
    category: "Lifestyle",
    stock: 18,
  },
  {
    id: "minimal-cap",
    name: "Minimal Cap",
    description: "Adjustable cotton cap with a structured crown and understated finish.",
    price: 1600,
    category: "Accessories",
    stock: 30,
  },
  {
    id: "daily-notebook",
    name: "Daily Notebook",
    description: "A5 hard-cover notebook with smooth ruled pages for daily planning.",
    price: 950,
    category: "Stationery",
    stock: 40,
  },
];

const batch = db.batch();
products.forEach((product, index) => {
  const { id, ...productData } = product;
  const ref = db.collection("products").doc(id);
  batch.set(
    ref,
    {
      ...productData,
      imageUrl: "/placeholder.svg",
      active: true,
      createdAt: now - index * 1000,
      updatedAt: now,
    },
    { merge: true }
  );
});

await batch.commit();
console.log(`Seeded ${products.length} products.`);
