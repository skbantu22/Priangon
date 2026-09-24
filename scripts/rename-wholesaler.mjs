// Renames the third partner tier from "retailer" to "wholesaler" in data
// that was written before the rename.
//
//   npm run rename:wholesaler              (show what would change)
//   npm run rename:wholesaler -- --apply   (actually write)
//
// Reads MONGODB_URI (and optional MONGODB_DB) from .env.local.
//
// Run this right after pulling the rename. Until it has run, a user,
// customer or order still holding "retailer" fails validation the next
// time anything saves it, because the enums no longer accept that value.
//
// Safe to run more than once: the second run finds nothing left to do.

import mongoose from "mongoose";

const { MONGODB_URI } = process.env;
const MONGODB_DB = process.env.MONGODB_DB || "MobiZone";
const APPLY = process.argv.includes("--apply");

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set (run with --env-file=.env.local)");
  process.exit(1);
}

// collection -> the field holding the tier
const VALUE_FIELDS = [
  ["users", "role"],
  ["customers", "type"],
  ["posorders", "customerType"],
  ["partnerorders", "partnerType"],
];

const run = async () => {
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB });

  const db = mongoose.connection.db;

  console.log(`\nDatabase: ${MONGODB_DB}`);
  console.log(APPLY ? "Mode: APPLY (writing)\n" : "Mode: DRY RUN (writing nothing)\n");

  console.log('1. "retailer" -> "wholesaler"');

  for (const [collection, field] of VALUE_FIELDS) {
    const count = await db
      .collection(collection)
      .countDocuments({ [field]: "retailer" });

    console.log(`   ${collection}.${field}: ${count} row(s)`);

    if (APPLY && count > 0) {
      const result = await db
        .collection(collection)
        .updateMany({ [field]: "retailer" }, { $set: { [field]: "wholesaler" } });

      console.log(`   → updated ${result.modifiedCount}`);
    }
  }

  console.log("\n2. products.retailerPrice -> products.wholesalerPrice");

  const withOld = await db
    .collection("products")
    .countDocuments({ retailerPrice: { $exists: true } });

  console.log(`   products carrying the old field: ${withOld}`);

  if (APPLY && withOld > 0) {
    // $rename keeps the value and drops the old key in one pass
    const result = await db
      .collection("products")
      .updateMany(
        { retailerPrice: { $exists: true } },
        { $rename: { retailerPrice: "wholesalerPrice" } },
      );

    console.log(`   → renamed on ${result.modifiedCount}`);
  }

  // Partner orders keep a copy of the rate on each line
  console.log("\n3. Embedded rate fields");

  for (const [collection, path] of [
    ["partnerorders", "items"],
    ["posorders", "items"],
  ]) {
    const count = await db
      .collection(collection)
      .countDocuments({ [`${path}.retailerPrice`]: { $exists: true } });

    console.log(`   ${collection}.${path}[].retailerPrice: ${count} row(s)`);

    if (APPLY && count > 0) {
      const result = await db
        .collection(collection)
        .updateMany(
          { [`${path}.retailerPrice`]: { $exists: true } },
          { $rename: { [`${path}.$[].retailerPrice`]: `${path}.$[].wholesalerPrice` } },
        )
        .catch(async (error) => {
          // $rename cannot reach into an array, so fall back to rewriting
          // the affected documents one at a time
          console.log(`   ($rename not usable here: ${error.message})`);

          const docs = await db
            .collection(collection)
            .find({ [`${path}.retailerPrice`]: { $exists: true } })
            .toArray();

          let n = 0;

          for (const doc of docs) {
            const items = (doc[path] || []).map((item) => {
              if (!("retailerPrice" in item)) return item;

              const { retailerPrice, ...rest } = item;
              return { ...rest, wholesalerPrice: retailerPrice };
            });

            await db
              .collection(collection)
              .updateOne({ _id: doc._id }, { $set: { [path]: items } });

            n += 1;
          }

          return { modifiedCount: n };
        });

      console.log(`   → updated ${result.modifiedCount}`);
    }
  }

  console.log(
    APPLY
      ? "\nDone.\n"
      : "\nNothing was written. Re-run with --apply to make these changes.\n",
  );

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("\nrename-wholesaler failed:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
