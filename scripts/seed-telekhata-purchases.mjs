// Demo purchases (with dues), customer due sales, accounts and banks for "SB Telecom 1".
// Builds on scripts/seed-telekhata-demo.mjs (run that first). Safe to run twice.
// Run: node --env-file=.env.local scripts/seed-telekhata-purchases.mjs
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});
const db = mongoose.connection.db;
const now = new Date();
const day = (text) => new Date(`${text}T12:00:00+06:00`);

const showroom = await db.collection("showrooms").findOne({ name: "SB Telecom 1" });
if (!showroom) throw new Error('Showroom "SB Telecom 1" was not found');
const shop = showroom._id;

// ------------------------------------------------------------------ products
const NAMES = [
  "EK-02 ইয়ারফোন Active",
  "0.3 mm tempered glass",
  "1.2 হাফ",
  "1.5 A,4G+ charger",
  "1/1 কট",
  "1/2 কট",
  "11 D tempered glass",
  "12/15 W DELL TREK AC LED 6 মাস গ্যারান্টি",
  "12w DC AC Nt bul ray",
  "12W HT19",
  "12w Led Nt Blu-Ray",
];
const product = {};
for (const [index, name] of NAMES.entries()) {
  const slug = `tk-demo-${String(index + 1).padStart(2, "0")}`;
  const doc = await db.collection("products").findOne({ slug });
  if (!doc) throw new Error(`Run scripts/seed-telekhata-demo.mjs first (missing ${slug})`);
  product[index + 1] = { productId: doc._id, variantId: doc.variants[0], name, sku: `TK-${String(index + 1).padStart(3, "0")}` };
}

const supplier = async (name) => {
  const row = await db.collection("suppliers").findOne({ name });
  if (!row) throw new Error(`Supplier ${name} is missing; run scripts/seed-telekhata-demo.mjs first`);
  return row;
};
const customer = async (name) => {
  const row = await db.collection("customers").findOne({ name });
  if (!row) throw new Error(`Customer ${name} is missing; run scripts/seed-telekhata-demo.mjs first`);
  return row;
};

// ------------------------------------------------------------------ banks + accounts
for (const name of ["Dutch-Bangla Bank", "City Bank", "Islami Bank"]) {
  if (!(await db.collection("banks").findOne({ name, showroomId: shop }))) {
    await db.collection("banks").insertOne({ name, branch: "", address: "", phone: "", showroomId: shop, isActive: true, deletedAt: null, createdAt: now, updatedAt: now });
    console.log("bank +", name);
  }
}

const accounts = {};
const wanted = [
  { key: "cash", name: "Cash", type: "cash", openingBalance: 25000 },
  { key: "bkash", name: "bKash", type: "mobile_banking", accountNumber: "01712345678", openingBalance: 8000 },
  { key: "bank", name: "Dutch-Bangla Bank", type: "bank", bankName: "Dutch-Bangla Bank", accountNumber: "1234567890", openingBalance: 60000 },
];
for (const item of wanted) {
  let row = await db.collection("accounts").findOne({ showroomId: shop, type: item.type, name: item.name, deletedAt: null });
  if (!row) {
    const doc = {
      name: item.name,
      type: item.type,
      bankName: item.bankName || "",
      accountNumber: item.accountNumber || "",
      openingBalance: item.openingBalance,
      openingDate: day("2026-09-01"),
      showroomId: shop,
      isActive: true,
      note: "",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    doc._id = (await db.collection("accounts").insertOne(doc)).insertedId;
    row = doc;
    console.log("account +", item.name);
  }
  accounts[item.key] = row._id;
}

const post = async (key, direction, amount, source, sourceId, reference, date, note = "") => {
  if (!(amount > 0)) return;
  const exists = await db.collection("accounttxs").findOne({ accountId: accounts[key], source, sourceId: String(sourceId), amount, deletedAt: null });
  if (exists) return;
  await db.collection("accounttxs").insertOne({
    accountId: accounts[key],
    showroomId: shop,
    direction,
    amount,
    source,
    sourceId: String(sourceId),
    reference,
    note,
    date,
    createdBy: "demo",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });
};

// ------------------------------------------------------------------ purchases
// [number, supplier, date, due date, [[product, qty, rate]...], [[method, account, amount]...]]
const purchases = [
  ["IN-17903160010000", "মুক্তা ইলেকট্রনিক্স", "2026-09-25", null, [[1, 10, 65], [2, 100, 13.5], [3, 5, 150]], [["cash", "cash", 1000]]],
  ["IN-17904888020001", "জাকারিয়া ইলেকট্রনিক", "2026-09-27", "2026-10-10", [[8, 10, 120], [9, 2, 600]], []],
  ["IN-17906616030002", "অন্তর টেলিকম", "2026-09-29", null, [[4, 20, 130]], [["bkash", "bkash", 2600]]],
  ["IN-17908344040003", "মা টেলিকম", "2026-10-01", "2026-10-12", [[7, 50, 20], [5, 20, 21], [6, 20, 28]], [["cash", "cash", 500]]],
  ["IN-17909208050004", "এন এস টেলিকম তুষখালী", "2026-10-02", "2026-10-15", [[10, 10, 180], [11, 5, 200]], [["bank", "bank", 800]]],
];

for (const [number, supplierName, date, dueDate, lines, pays] of purchases) {
  if (await db.collection("purchases").findOne({ purchaseNumber: number })) continue;

  const owner = await supplier(supplierName);
  const when = day(date);

  const items = lines.map(([id, quantity, unitPrice]) => ({
    productId: product[id].productId,
    variantId: product[id].variantId,
    productName: product[id].name,
    variantLabel: "",
    sku: product[id].sku,
    quantity,
    extraQty: 0,
    unitPrice,
    discount: 0,
    total: Math.round(quantity * unitPrice * 100) / 100,
    expireDate: null,
    returnedQty: 0,
    newRates: { sellingPrice: 0, dealerPrice: 0, subDealerPrice: 0, wholesalerPrice: 0 },
    imeis: [],
  }));
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const payments = pays.map(([method, , amount]) => ({
    _id: new mongoose.Types.ObjectId(),
    amount,
    method,
    reference: "",
    note: "Paid while creating the purchase",
    paidAt: when,
    createdBy: "demo",
    supplierPaymentId: null,
  }));
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const due = Math.round((subtotal - paid) * 100) / 100;

  const id = (
    await db.collection("purchases").insertOne({
      purchaseNumber: number,
      supplierId: owner._id,
      supplierName: owner.name,
      referenceNo: "",
      purchaseDate: when,
      dueDate: dueDate ? day(dueDate) : null,
      showroomId: shop,
      locationName: showroom.name,
      purchaseOrderId: null,
      attachment: { url: "", publicId: "" },
      items,
      subtotal,
      discount: 0,
      discountType: "amount",
      discountValue: 0,
      shippingCost: 0,
      grandTotal: subtotal,
      payments,
      paidAmount: paid,
      dismissAmount: 0,
      dueAmount: due,
      paymentStatus: due <= 0 ? "paid" : paid <= 0 ? "unpaid" : "partial",
      status: "received",
      receivedAt: when,
      note: "Demo",
      createdBy: "demo",
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  ).insertedId;

  for (const [, key, amount] of pays) await post(key, "out", amount, "purchase", id, number, when);
  console.log("purchase +", number, owner.name, "total", subtotal, "due", due);
}

// ------------------------------------------------------------------ customer due sales
// [number, customer, date, [[product, qty, price]...], [[type, option, account, amount]...]]
const sales = [
  ["IN-17905752060005", "আমান", "2026-09-28", [[8, 5, 200], [7, 10, 100]], [["Cash", "", "cash", 500]]],
  ["IN-17907480070006", "মেহেদী বেতমোর বাজার", "2026-09-30", [[2, 20, 100]], [["Mobile Banking", "bKash", "bkash", 2000]]],
  ["IN-17908344080007", "মেহেদী বেতমোর বাজার", "2026-10-01", [[1, 5, 180]], [["Cash", "", "cash", 400]]],
  ["IN-17909208090008", "রুবেল ইড়কি", "2026-10-02", [[10, 4, 250]], []],
];

for (const [number, name, date, lines, pays] of sales) {
  if (await db.collection("posorders").findOne({ orderNumber: number })) continue;

  const buyer = await customer(name);
  const when = day(date);

  const items = lines.map(([id, qty, price]) => ({
    productId: product[id].productId,
    variantId: product[id].variantId,
    productName: product[id].name,
    image: "",
    color: "",
    size: "",
    qty,
    price,
    purchasePrice: 0,
    subtotal: qty * price,
    imeis: [],
    warrantyType: "none",
    warrantyMonths: 0,
    warrantyExpiry: null,
  }));
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const payments = pays.map(([type, option, , amount]) => ({ type, option, amount }));
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  const id = (
    await db.collection("posorders").insertOne({
      orderNumber: number,
      showroomId: shop,
      soldFrom: "SHOWROOM",
      locationName: showroom.name,
      userId: null,
      items,
      subTotal: total,
      discount: 0,
      vat: 0,
      total,
      customerId: buyer._id,
      customerType: "retail",
      customerName: buyer.name,
      phone: buyer.phone,
      address: "",
      saleDate: when,
      remark: "Demo",
      soldBy: "demo",
      payments,
      paidAmount: paid,
      dueAmount: Math.max(0, total - paid),
      dismissAmount: 0,
      status: "completed",
      orderType: "pos",
      exchange: { isExchange: false, reason: "", returnedItems: [], newItems: [], refundAmount: 0, extraPaid: 0, exchangeDate: when, processedBy: null },
      createdAt: when,
      updatedAt: when,
    })
  ).insertedId;

  await db.collection("customers").updateOne({ _id: buyer._id }, { $inc: { totalOrders: 1, totalSpent: total } });
  for (const [, , key, amount] of pays) await post(key, "in", amount, "sale", id, number, when);
  console.log("sale +", number, buyer.name, "total", total, "due", Math.max(0, total - paid));
}

console.log("done");
await mongoose.disconnect();
