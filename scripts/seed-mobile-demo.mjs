// Fills the store database with starter mobile-shop data (MobiZone):
// catalog with warranty terms, stock, showrooms, customers, staff logins,
// and a few past sales + warranty claims.
//
//   npm run seed:mobile            (only if the database has no sales yet)
//   npm run seed:mobile -- --reset (wipe it and start over)
//
// Reads MONGODB_URI (and optional MONGODB_DB) from .env.local.

import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { CATEGORIES, PRODUCTS, slugify } from "./mobile-catalog.mjs";
import { IMG_DIR, productImageSvg } from "./demo-art.mjs";

const { MONGODB_URI } = process.env;
// same default as lib/databaseconnection.js
const MONGODB_DB = process.env.MONGODB_DB || "MobiZone";
const RESET = process.argv.includes("--reset");

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (run with --env-file=.env.local)");
  process.exit(1);
}
// Warranty terms per product type. trackSerial = IMEI / serial required at sale
const WARRANTY_BY_KIND = {
  phone: { type: "official", months: 12, trackSerial: true },
  watch: { type: "brand", months: 12, trackSerial: true },
  earbuds: { type: "brand", months: 6, trackSerial: true },
  headphones: { type: "shop", months: 6, trackSerial: false },
  powerbank: { type: "shop", months: 6, trackSerial: false },
  charger: { type: "shop", months: 6, trackSerial: false },
  cable: { type: "shop", months: 3, trackSerial: false },
  memory: { type: "brand", months: 24, trackSerial: false },
  case: { type: "none", months: 0, trackSerial: false },
  glass: { type: "none", months: 0, trackSerial: false },
};
const warrantyFor = (p) => {
  const w = { ...WARRANTY_BY_KIND[p.kind] };
  // Apple products carry Apple's own (brand) warranty, not a BD distributor's
  if (/^(iphone|airpods|apple)/i.test(p.name)) w.type = "brand";
  if (/^airpods/i.test(p.name)) w.months = 12;
  return w;
};

// brand from the product name (first match wins)
const BRAND_RULES = [
  [/^(iphone|airpods|apple)/i, "Apple"],
  [/^samsung/i, "Samsung"],
  [/^(xiaomi|redmi)/i, "Xiaomi"],
  [/^oneplus/i, "OnePlus"],
  [/^realme/i, "realme"],
  [/^oppo/i, "OPPO"],
  [/^vivo/i, "vivo"],
  [/^infinix/i, "Infinix"],
  [/^tecno/i, "TECNO"],
  [/^nokia/i, "Nokia"],
  [/^spigen/i, "Spigen"],
  [/^boat/i, "boAt"],
  [/^jbl/i, "JBL"],
  [/^anker/i, "Anker"],
  [/^amazfit/i, "Amazfit"],
  [/^sandisk/i, "SanDisk"],
  [/^baseus/i, "Baseus"],
];
const brandOf = (name) =>
  BRAND_RULES.find(([rx]) => rx.test(name))?.[1] || "Generic";

// single store (stock is kept against it; the UI never shows it)
const SHOWROOMS = [
  { name: "Main Store", address: "Road 27, Dhanmondi, Dhaka", phone: "01700000001" },
];

// [name, phone, address, price list]
const CUSTOMERS = [
  ["Rahim Uddin", "01811111111", "Mirpur 10, Dhaka", "retail"],
  ["Karim Traders", "01822222222", "Gulistan, Dhaka", "dealer"],
  ["Nusrat Jahan", "01933333333", "Banani, Dhaka", "retail"],
  ["Sabbir Telecom", "01644444444", "Savar, Dhaka", "retailer"],
  ["Hasan Mobile Point", "01755555555", "Mohammadpur, Dhaka", "subDealer"],
];

// starter logins: change these passwords after the first login
// (partner logins use `customer` = index in CUSTOMERS)
const STAFF = [
  { name: "Admin", email: "admin@mobizone.com", password: "admin1234", role: "admin" },
  { name: "Cashier", email: "cashier@mobizone.com", password: "cashier1234", role: "cashier", showroom: 0 },
  { name: "Abdul Karim", email: "dealer@mobizone.com", password: "dealer1234", role: "dealer", customer: 1 },
  { name: "Hasan Ali", email: "subdealer@mobizone.com", password: "subdealer1234", role: "subDealer", customer: 4 },
  { name: "Sabbir Hossain", email: "retailer@mobizone.com", password: "retailer1234", role: "retailer", customer: 3 },
];

// price list of each product, as a share of its retail price (rounded to ৳10)
const TIER_RATIO = { purchasePrice: 0.85, dealerPrice: 0.9, subDealerPrice: 0.93, retailerPrice: 0.96 };
const TIER_FIELD = { dealer: "dealerPrice", subDealer: "subDealerPrice", retailer: "retailerPrice" };
const round10 = (n) => Math.round(n / 10) * 10;
// same rule as lib/priceTiers.js: a dearer variant keeps the product's ratio
const priceFor = (product, variant, type) => {
  const field = TIER_FIELD[type];
  if (!field || !product[field]) return variant.sellingPrice;
  if (variant.sellingPrice === product.sellingPrice) return product[field];
  return Math.round((variant.sellingPrice * product[field]) / product.sellingPrice);
};

// dealer orders waiting in the portal: [customerIndex, status, [[productName, optionIndex, colorIndex, qty]], note]
const PARTNER_ORDERS = [
  [1, "pending", [["Samsung Galaxy A05", 0, 0, 3], ["Samsung 25W Charger", 0, 0, 5]], "Please deliver by tomorrow"],
  [3, "confirmed", [["Xiaomi Redmi A3", 1, 0, 2], ["Samsung Silicone Case", 0, 0, 2]], ""],
  [4, "pending", [["Infinix Note 40", 0, 0, 2]], "Payment on delivery"],
];

// ---------------------------------------------------------------------------

// deterministic "random" stock so every run gives the same numbers
let seed = 7;
const rand = (min, max) => {
  seed = (seed * 9301 + 49297) % 233280;
  return min + Math.floor((seed / 233280) * (max - min + 1));
};

const digits = (n) => Array.from({ length: n }, () => rand(0, 9)).join("");
// 15-digit IMEI (TAC-like prefix + random) or a 12-char serial
const makeSerial = (kind) =>
  kind === "phone"
    ? `35${digits(13)}`
    : `SN${Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[rand(0, 31)]).join("")}`;

const addMonths = (date, m) => {
  const d = new Date(date);
  d.setMonth(d.getMonth() + m);
  return d;
};
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Past sales: [daysAgo, customerIndex, [[productName, optionIndex, colorIndex, qty]], paymentType, dueAmount]
const PAST_SALES = [
  [420, 0, [["Samsung Galaxy A15", 0, 0, 1]], "Cash", 0], // warranty expired
  [380, 2, [["Xiaomi Redmi 13C", 1, 1, 1], ["Tempered Glass", 2, 0, 1]], "Mobile Banking", 0], // expired
  [300, 1, [["Nokia 105", 0, 0, 3], ["Type-C Data Cable", 0, 0, 5]], "Cash", 2000], // dealer, due
  [200, 3, [["realme Narzo 70", 0, 0, 1]], "Card", 0],
  [150, 2, [["iPhone 15", 0, 1, 1], ["Spigen Phone Case", 0, 1, 1]], "Card", 0],
  [120, 0, [["AirPods Pro (2nd Gen)", 0, 0, 1]], "Mobile Banking", 0],
  [90, 1, [["Infinix Hot 40", 0, 0, 2]], "Cash", 5000], // dealer, due
  [60, 3, [["Samsung Galaxy S24", 0, 0, 1], ["Samsung 25W Charger", 0, 0, 1]], "Card", 0],
  [45, 0, [["Apple Watch Series 9", 0, 0, 1]], "Card", 0],
  [30, 2, [["OnePlus Nord CE 4", 1, 0, 1]], "Mobile Banking", 0],
  [14, 3, [["Vivo Y18", 0, 1, 1], ["Anker 20000mAh Power Bank", 0, 0, 1]], "Cash", 0],
  [7, 0, [["Xiaomi Redmi Note 13", 1, 0, 1]], "Cash", 0],
  [3, 1, [["TECNO Spark 20", 0, 0, 2], ["Tempered Glass", 1, 0, 2]], "Cash", 3000],
  [1, 2, [["JBL Tune 520BT", 0, 1, 1]], "Mobile Banking", 0],
];

// [saleIndex, itemIndex, issue, status, notes]
const PAST_CLAIMS = [
  [3, 0, "Display / touch problem", "sent_to_service", "Green line on display, no physical damage"],
  [5, 0, "Left earbud not charging", "replaced", "Replaced by Apple authorized service"],
  [7, 0, "Battery drains fast / not charging", "received", "Battery health checked: 87%"],
  [0, 0, "Charging port problem", "rejected", "Warranty expired, paid service offered"],
];

async function main() {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });
  const db = mongoose.connection.db;

  // never wipe a store that already has sales unless explicitly asked
  const existingSales = await db.collection("posorders").countDocuments().catch(() => 0);
  if (existingSales > 0 && !RESET) {
    console.error(
      `"${MONGODB_DB}" already has ${existingSales} sales. Nothing changed.\nRun "npm run seed:mobile -- --reset" only if you really want to wipe it.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`Connected to "${MONGODB_DB}", filling it...`);
  await db.dropDatabase();

  fs.mkdirSync(IMG_DIR, { recursive: true });

  const now = new Date();
  const stamp = { createdAt: now, updatedAt: now };
  const id = () => new mongoose.Types.ObjectId();

  // categories
  const categoryIds = {};
  await db.collection("categories").insertMany(
    CATEGORIES.map((name) => {
      categoryIds[name] = id();
      return { _id: categoryIds[name], name, slug: slugify(name), subcategories: [], deletedAt: null, ...stamp };
    }),
  );

  // showrooms
  const showrooms = SHOWROOMS.map((s) => ({ _id: id(), ...s, isActive: true, ...stamp }));
  await db.collection("showrooms").insertMany(showrooms);

  const products = [];
  const variants = [];
  const medias = [];
  const stocks = [];
  const catalog = {}; // name -> { product, kind, variants[color][option] }
  let barcode = 8901000000001;

  for (const p of PRODUCTS) {
    const productId = id();
    const slug = slugify(p.name);
    const warranty = warrantyFor(p);

    // one image per color; the first one is the product's main image
    const mediaIds = p.colors.map((color) => {
      const file = `${slug}-${slugify(color.name)}.svg`;
      fs.writeFileSync(path.join(IMG_DIR, file), productImageSvg(p, color));
      const mediaId = id();
      medias.push({
        _id: mediaId,
        asset_id: `demo-${slug}-${slugify(color.name)}`,
        public_id: `demo/${file}`,
        secure_url: `/demo/${file}`,
        title: `${p.name} ${color.name}`,
        alt: `${p.name} ${color.name}`,
        deletedAt: null,
        ...stamp,
      });
      return mediaId;
    });

    const variantIds = [];
    const grid = [];
    p.colors.forEach((color) => {
      const row = [];
      p.options.forEach(([label, price, mrp]) => {
        const variantId = id();
        const perShowroom = showrooms.map(() => rand(2, 30));
        variantIds.push(variantId);
        const variant = {
          _id: variantId,
          product: productId,
          color: color.name,
          size: label,
          priceSource: "CUSTOM",
          mrp,
          sellingPrice: price,
          discountPercentage: Math.round(((mrp - price) / mrp) * 100),
          sku: `${slug}-${slugify(color.name)}-${slugify(label)}`.toUpperCase(),
          barcode: String(barcode++),
          stock: perShowroom.reduce((a, b) => a + b, 0),
          sold: 0,
          isActive: true,
          media: [`/demo/${slug}-${slugify(color.name)}.svg`],
          videos: [],
          deletedAt: null,
          ...stamp,
        };
        variants.push(variant);
        row.push(variant);
        showrooms.forEach((s, si) =>
          stocks.push({ _id: id(), showroomId: s._id, productId, variantId, stock: perShowroom[si], ...stamp }),
        );
      });
      grid.push(row);
    });

    const [, firstPrice, firstMrp] = p.options[0];
    const product = {
      _id: productId,
      name: p.name,
      slug,
      category: categoryIds[p.cat],
      subcategory: null,
      brand: brandOf(p.name),
      warranty: { type: warranty.type, months: warranty.months },
      trackSerial: warranty.trackSerial,
      mrp: firstMrp,
      sellingPrice: firstPrice,
      discountPercentage: Math.round(((firstMrp - firstPrice) / firstMrp) * 100),
      // price list: purchase / dealer / sub dealer / retailer (retail = sellingPrice)
      ...Object.fromEntries(Object.entries(TIER_RATIO).map(([f, r]) => [f, round10(firstPrice * r)])),
      offers: [],
      freeDelivery: false,
      media: mediaIds,
      reviewScreenshots: [],
      videos: [],
      description: `<p>${p.name} (${brandOf(p.name)}) — ${p.cat}.</p><p>${
        warranty.months ? `${warranty.months} months ${warranty.type} warranty.` : "No warranty."
      }</p>`,
      color: p.colors[0].name,
      size: p.options[0][0],
      variants: variantIds,
      deletedAt: null,
      ...stamp,
    };
    products.push(product);
    catalog[p.name] = { product, kind: p.kind, grid };
  }

  await db.collection("medias").insertMany(medias);
  await db.collection("products").insertMany(products);
  await db.collection("productvariants").insertMany(variants);
  await db.collection("showroomstocks").insertMany(stocks);

  const customers = CUSTOMERS.map(([name, phone, address, type]) => ({
    _id: id(), name, phone, address, type, totalOrders: 0, totalSpent: 0, ...stamp,
  }));

  const staff = await Promise.all(
    STAFF.map(async (s) => ({
      _id: id(),
      name: s.name,
      email: s.email,
      role: s.role,
      showroomId: s.showroom === undefined ? null : showrooms[s.showroom]._id,
      customerId: s.customer === undefined ? null : customers[s.customer]._id,
      password: await bcrypt.hash(s.password, 10),
      tokenVersion: 0,
      isEmailVerified: true,
      phone: s.customer === undefined ? "01700000000" : customers[s.customer].phone,
      deletedAt: null,
      ...stamp,
    })),
  );
  await db.collection("users").insertMany(staff);

  // ---- past sales, with IMEIs and warranty dates ----
  const orders = PAST_SALES.map(([ago, ci, lines, payType, due], i) => {
    const saleDate = daysAgo(ago);
    const customer = customers[ci];
    const items = lines.map(([name, oi, coi, qty]) => {
      const { product, kind, grid } = catalog[name];
      const v = grid[coi][oi];
      const months = product.warranty.months;
      return {
        _id: id(),
        productId: product._id,
        variantId: v._id,
        productName: product.name,
        image: v.media[0],
        color: v.color,
        size: v.size,
        qty,
        // dealers / retailers bought at their own price list
        price: priceFor(product, v, customer.type),
        subtotal: priceFor(product, v, customer.type) * qty,
        imeis: product.trackSerial ? Array.from({ length: qty }, () => makeSerial(kind)) : [],
        warrantyType: months ? product.warranty.type : "none",
        warrantyMonths: months,
        warrantyExpiry: months ? addMonths(saleDate, months) : null,
      };
    });
    const total = items.reduce((s, it) => s + it.subtotal, 0);
    const paid = total - due;
    customer.totalOrders += 1;
    customer.totalSpent += total;

    return {
      _id: id(),
      orderNumber: `INV-${String(i + 1).padStart(6, "0")}`,
      showroomId: showrooms[i % showrooms.length]._id,
      userId: staff[0]._id,
      items,
      subTotal: total,
      discount: 0,
      vat: 0,
      total,
      customerId: customer._id,
      customerType: customer.type,
      customerName: customer.name,
      phone: customer.phone,
      address: customer.address,
      saleDate,
      remark: "",
      soldBy: staff[i % 2].name,
      payments: [{ _id: id(), type: payType, option: payType === "Mobile Banking" ? "bKash" : "", amount: paid }],
      paidAmount: paid,
      dueAmount: due,
      deliveryCharge: 0,
      status: "completed",
      orderType: "pos",
      exchange: { isExchange: false, reason: "", returnedItems: [], newItems: [], refundAmount: 0, extraPaid: 0, returnedTotal: 0, newTotal: 0, difference: 0 },
      createdAt: saleDate,
      updatedAt: saleDate,
    };
  });

  await db.collection("customers").insertMany(customers);
  await db.collection("posorders").insertMany(orders);

  const claims = PAST_CLAIMS.map(([si, ii, issue, status, notes], n) => {
    const order = orders[si];
    const item = order.items[ii];
    const created = new Date(Math.min(Date.now(), order.saleDate.getTime() + (n + 20) * 24 * 3600 * 1000));
    return {
      _id: id(),
      claimNumber: `WC-${String(n + 1).padStart(5, "0")}`,
      orderId: order._id,
      orderNumber: order.orderNumber,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: [item.size, item.color].filter(Boolean).join(" · "),
      imei: item.imeis[0] || "",
      customerName: order.customerName,
      phone: order.phone,
      warrantyExpiry: item.warrantyExpiry,
      underWarranty: !!item.warrantyExpiry && item.warrantyExpiry > created,
      issue,
      status,
      notes,
      showroomId: order.showroomId,
      receivedBy: staff[1].name,
      deliveredAt: null,
      createdAt: created,
      updatedAt: created,
    };
  });
  await db.collection("warrantyclaims").insertMany(claims);

  // ---- orders waiting in the partner portal ----
  const partnerOrders = PARTNER_ORDERS.map(([ci, status, lines, note], n) => {
    const customer = customers[ci];
    const login = staff.find((u) => String(u.customerId) === String(customer._id));
    const items = lines.map(([name, oi, coi, qty]) => {
      const { product, grid } = catalog[name];
      const v = grid[coi][oi];
      const price = priceFor(product, v, customer.type);
      return {
        _id: id(),
        productId: product._id,
        variantId: v._id,
        productName: product.name,
        image: v.media[0],
        color: v.color,
        size: v.size,
        qty,
        price,
        subtotal: price * qty,
      };
    });
    const created = daysAgo(PARTNER_ORDERS.length - n);
    return {
      _id: id(),
      orderNumber: `PO-${String(n + 1).padStart(5, "0")}`,
      userId: login._id,
      customerId: customer._id,
      customerType: customer.type,
      customerName: customer.name,
      phone: customer.phone,
      showroomId: showrooms[0]._id,
      items,
      total: items.reduce((s, it) => s + it.subtotal, 0),
      note,
      status,
      staffNote: "",
      posOrderId: null,
      invoiceNumber: "",
      createdAt: created,
      updatedAt: created,
    };
  });
  await db.collection("partnerorders").insertMany(partnerOrders);

  // keep the invoice / claim / order counters in step with the seeded numbers
  await db.collection("counters").insertMany([
    { name: "pos_invoice", seq: orders.length, ...stamp },
    { name: "warranty_claim", seq: claims.length, ...stamp },
    { name: "partner_order", seq: partnerOrders.length, ...stamp },
  ]);

  const sampleImei = orders[3].items[0].imeis[0];
  console.log(`
Done ("${MONGODB_DB}"):
  ${CATEGORIES.length} categories, ${products.length} products, ${variants.length} variants
  ${showrooms.length} showrooms, ${stocks.length} stock rows, ${customers.length} customers
  ${orders.length} past sales, ${claims.length} warranty claims, ${partnerOrders.length} dealer orders
  images in public/demo

Try the warranty check with IMEI ${sampleImei}

Logins (change the passwords after first login):
${STAFF.map((s) => `  ${s.email.padEnd(22)} / ${s.password.padEnd(12)} (${s.role})`).join("\n")}
`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});

