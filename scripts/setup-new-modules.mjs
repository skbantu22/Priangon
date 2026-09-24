// One-off setup for the modules added in this branch.
//
//   npm run setup:modules              (show what would change, write nothing)
//   npm run setup:modules -- --apply   (actually write)
//
// Reads MONGODB_URI (and optional MONGODB_DB) from .env.local.
//
// It does three things:
//
//   1. Copies each product's purchase price onto its variants, so the
//      Profit & Loss report has a cost to work with from day one instead
//      of counting every old sale as pure profit. Purchases keep it as a
//      moving average from then on. A variant that already has a cost is
//      left alone.
//   2. Seeds the expense categories a mobile shop actually uses, if none
//      exist yet.
//   3. Builds the indexes the new collections declare.
//
// Safe to run more than once: nothing already set is overwritten.

import mongoose from "mongoose";

const { MONGODB_URI } = process.env;
// same default as lib/databaseconnection.js
const MONGODB_DB = process.env.MONGODB_DB || "MobiZone";
const APPLY = process.argv.includes("--apply");

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (run with --env-file=.env.local)");
  process.exit(1);
}

const EXPENSE_CATEGORIES = [
  "Shop Rent",
  "Staff Salary",
  "Electricity",
  "Internet",
  "Transport",
  "Packaging",
  "Marketing",
  "Repair & Maintenance",
  "Bank Charge",
  "Others",
];

const log = (...args) => console.log(...args);

const run = async () => {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });

  const db = mongoose.connection.db;

  log(`\nDatabase: ${MONGODB_DB}`);
  log(APPLY ? "Mode: APPLY (writing)\n" : "Mode: DRY RUN (writing nothing)\n");

  /* ---------------------------------------------------------
     1. Variant purchase price
  --------------------------------------------------------- */
  const products = await db
    .collection("products")
    .find(
      { purchasePrice: { $gt: 0 } },
      { projection: { _id: 1, name: 1, purchasePrice: 1 } },
    )
    .toArray();

  const costByProduct = new Map(
    products.map((p) => [String(p._id), p.purchasePrice]),
  );

  const variants = await db
    .collection("productvariants")
    .find(
      {
        $or: [{ purchasePrice: { $exists: false } }, { purchasePrice: 0 }],
      },
      { projection: { _id: 1, product: 1 } },
    )
    .toArray();

  const toUpdate = variants.filter((v) => costByProduct.has(String(v.product)));

  log(`1. Variant purchase price`);
  log(`   products with a cost set : ${products.length}`);
  log(`   variants missing a cost  : ${variants.length}`);
  log(`   can be filled from parent: ${toUpdate.length}`);

  if (variants.length > toUpdate.length) {
    log(
      `   ${variants.length - toUpdate.length} variant(s) have no cost anywhere;`,
    );
    log(`   those get one the first time a purchase is received for them.`);
  }

  if (APPLY && toUpdate.length > 0) {
    const ops = toUpdate.map((v) => ({
      updateOne: {
        filter: { _id: v._id },
        update: { $set: { purchasePrice: costByProduct.get(String(v.product)) } },
      },
    }));

    const result = await db.collection("productvariants").bulkWrite(ops);
    log(`   → updated ${result.modifiedCount}`);
  }

  /* ---------------------------------------------------------
     2. Expense categories
  --------------------------------------------------------- */
  const existing = await db.collection("expensecategories").countDocuments({});

  log(`\n2. Expense categories`);
  log(`   already present: ${existing}`);

  if (existing === 0) {
    log(`   would add      : ${EXPENSE_CATEGORIES.length}`);

    if (APPLY) {
      const now = new Date();

      await db.collection("expensecategories").insertMany(
        EXPENSE_CATEGORIES.map((name) => ({
          name,
          isActive: true,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        })),
      );

      log(`   → added ${EXPENSE_CATEGORIES.length}`);
    }
  } else {
    log(`   nothing to add`);
  }

  /* ---------------------------------------------------------
     3. Indexes
  --------------------------------------------------------- */
  log(`\n3. Indexes`);

  const INDEXES = {
    brands: [{ key: { slug: 1 }, unique: true }, { key: { isActive: 1 } }],
    units: [{ key: { name: 1 }, unique: true }],
    suppliers: [{ key: { name: 1, phone: 1 }, unique: true }, { key: { deletedAt: 1 } }],
    purchases: [
      { key: { purchaseNumber: 1 }, unique: true },
      { key: { supplierId: 1, purchaseDate: -1 } },
      { key: { status: 1, paymentStatus: 1 } },
    ],
    expenses: [
      { key: { voucherNumber: 1 }, unique: true },
      { key: { expenseDate: -1 } },
      { key: { categoryId: 1 } },
    ],
    supporttickets: [
      { key: { ticketNumber: 1 }, unique: true },
      { key: { phone: 1 } },
      { key: { status: 1 } },
      { key: { imei: 1 } },
    ],
    attributes: [{ key: { name: 1 }, unique: true }, { key: { slot: 1 } }],
    settings: [{ key: { key: 1 }, unique: true }],
  };

  for (const [collection, indexes] of Object.entries(INDEXES)) {
    if (!APPLY) {
      log(`   ${collection}: ${indexes.length} index(es) would be ensured`);
      continue;
    }

    try {
      await db.collection(collection).createIndexes(indexes);
      log(`   ${collection}: ok`);
    } catch (error) {
      // A duplicate here means real duplicate data, which a script must
      // never silently delete — it is reported for a person to settle
      log(`   ${collection}: FAILED — ${error.message}`);
    }
  }

  log(
    APPLY
      ? "\nDone.\n"
      : "\nNothing was written. Re-run with --apply to make these changes.\n",
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("\nsetup-new-modules failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
