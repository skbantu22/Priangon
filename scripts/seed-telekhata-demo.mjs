// Telekhata demo data, the same shop as the sample app:
// suppliers, customers, mobile accessories with stock, and a few baki entries.
// Safe to run twice: anything that already exists is skipped.
// Run: node --env-file=.env.local scripts/seed-telekhata-demo.mjs
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});
const db = mongoose.connection.db;
const now = new Date();
const oid = (value) => new mongoose.Types.ObjectId(String(value));

const showroom =
  (await db.collection("showrooms").findOne({ name: "SB Telecom 1" })) ||
  (await db.collection("showrooms").findOne({ name: /SB Telecom/i }));
if (!showroom) throw new Error('Showroom "SB Telecom 1" was not found');
const showroomId = String(showroom._id);
console.log("showroom:", showroom.name, showroomId);

// ---------------------------------------------------------------- suppliers
const suppliers = [
  ["জাকারিয়া ইলেকট্রনিক", "01919865257"],
  ["অন্তর টেলিকম", "01780324969"],
  ["মুক্তা ইলেকট্রনিক্স", "01712507250"],
  ["জে কে টেলিকম", "01755711755"],
  ["অভি সান্নাই", "01912710965"],
  ["Sannai", "01645544155"],
  ["মা টেলিকম", "01722541865"],
  ["এন এস টেলিকম তুষখালী", "01745051394"],
  ["বেল্লাল নার্সারী", "01746839289"],
];
const supplierIds = {};
for (const [name, phone] of suppliers) {
  const found = await db.collection("suppliers").findOne({ name, phone });
  if (found) {
    supplierIds[name] = found._id;
    continue;
  }
  const doc = {
    name,
    phone,
    companyName: "",
    email: "",
    address: "",
    openingBalance: 0,
    initialAdvance: 0,
    openingDate: null,
    srName: "",
    srMobile: "",
    dsrName: "",
    dsrMobile: "",
    note: "",
    isActive: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  supplierIds[name] = (await db.collection("suppliers").insertOne(doc)).insertedId;
  console.log("supplier +", name);
}

// ---------------------------------------------------------------- customers
const customers = [
  ["আমান", "01905253230"],
  ["স্মার্টফোন এন্ড গ্যাজেট", "01917528513"],
  ["মেহেদী বেতমোর বাজার", "01705713806"],
  ["রুবেল ইড়কি", "01720462893"],
];
const customerIds = {};
for (const [name, phone] of customers) {
  const found = await db.collection("customers").findOne({ phone });
  if (found) {
    customerIds[name] = found._id;
    continue;
  }
  customerIds[name] = (
    await db.collection("customers").insertOne({
      name,
      businessName: "",
      photo: "",
      area: "",
      membershipNumber: "",
      attachment: "",
      phone,
      email: "",
      address: "",
      type: "retail",
      openingDue: 0,
      initialAdvance: 0,
      openingDate: null,
      note: "",
      isActive: true,
      totalOrders: 0,
      totalSpent: 0,
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId;
  console.log("customer +", name);
}

// ---------------------------------------------------------------- products
let category = await db.collection("categories").findOne({ name: "মোবাইল এক্সেসরিজ", showroomId });
if (!category) {
  const id = (
    await db.collection("categories").insertOne({
      name: "মোবাইল এক্সেসরিজ",
      slug: "mobile-accessories",
      showroomId,
      isActive: true,
      subcategories: [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId;
  category = { _id: id };
  console.log("category + মোবাইল এক্সেসরিজ");
}

// [name, stock, sell price, cost price]
const products = [
  ["EK-02 ইয়ারফোন Active", 0, 180, 65],
  ["0.3 mm tempered glass", 650, 100, 13.5],
  ["1.2 হাফ", 0, 250, 150],
  ["1.5 A,4G+ charger", 0, 250, 130],
  ["1/1 কট", 1, 50, 21],
  ["1/2 কট", 0, 60, 28],
  ["11 D tempered glass", 102, 100, 20],
  ["12/15 W DELL TREK AC LED 6 মাস গ্যারান্টি", 13, 200, 120],
  ["12w DC AC Nt bul ray", 1, 850, 600],
  ["12W HT19", 0, 250, 180],
  ["12w Led Nt Blu-Ray", 0, 290, 200],
];

for (const [index, [name, stock, sell, cost]] of products.entries()) {
  const slug = `tk-demo-${String(index + 1).padStart(2, "0")}`;
  if (await db.collection("products").findOne({ slug })) continue;

  const productId = new mongoose.Types.ObjectId();
  const variantId = new mongoose.Types.ObjectId();

  await db.collection("productvariants").insertOne({
    _id: variantId,
    product: productId,
    color: "Default",
    size: "Default",
    priceSource: "PRODUCT",
    mrp: sell,
    sellingPrice: sell,
    dealerPrice: 0,
    subDealerPrice: 0,
    wholesalerPrice: 0,
    discountPercentage: 0,
    sku: `TK-${String(index + 1).padStart(3, "0")}`,
    purchasePrice: cost,
    stock,
    sold: 0,
    isActive: true,
    media: [],
    videos: [],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("products").insertOne({
    _id: productId,
    name,
    slug,
    category: category._id,
    subcategory: null,
    brand: "",
    warranty: { type: "none", months: 0 },
    productType: "variant",
    unit: "Pcs",
    code: "",
    trackSerial: false,
    mrp: sell,
    sellingPrice: sell,
    purchasePrice: cost,
    dealerPrice: 0,
    subDealerPrice: 0,
    wholesalerPrice: 0,
    offers: [],
    media: [],
    videos: [],
    variants: [variantId],
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("showroomstocks").insertOne({
    showroomId: oid(showroomId),
    productId,
    variantId,
    stock,
    createdAt: now,
    updatedAt: now,
  });
  console.log("product +", name);
}

// ---------------------------------------------------------------- baki entries
const entries = [
  { type: "customer", id: customerIds["আমান"], direction: "give", amount: 9164, note: "বাকি", date: new Date("2026-10-01T10:00:00") },
  { type: "customer", id: customerIds["স্মার্টফোন এন্ড গ্যাজেট"], direction: "give", amount: 10495, note: "খাতা", date: new Date("2026-08-25T01:00:00") },
  { type: "customer", id: customerIds["স্মার্টফোন এন্ড গ্যাজেট"], direction: "take", amount: 10495, note: "খাতা", date: new Date("2026-08-25T01:39:00") },
  { type: "supplier", id: supplierIds["জাকারিয়া ইলেকট্রনিক"], direction: "take", amount: 25000, note: "মাল বাকি", date: new Date("2026-09-20T12:00:00") },
];
for (const entry of entries) {
  const exists = await db.collection("khataentries").findOne({
    partyId: entry.id,
    direction: entry.direction,
    amount: entry.amount,
    showroomId,
    deletedAt: null,
  });
  if (exists) continue;
  await db.collection("khataentries").insertOne({
    partyType: entry.type,
    partyId: entry.id,
    direction: entry.direction,
    kind: "money",
    amount: entry.amount,
    note: entry.note,
    photo: "",
    date: entry.date,
    showroomId,
    createdBy: "demo",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
  console.log("khata +", entry.type, entry.direction, entry.amount);
}

console.log("done");
await mongoose.disconnect();
