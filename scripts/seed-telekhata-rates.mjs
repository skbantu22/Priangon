// Gives the Telekhata demo products dealer / sub dealer / wholesaler rates.
// Same shape as lib/priceTiers: purchase < dealer < sub dealer < wholesaler < retail.
// Only fills rates that are still 0. Safe to run twice.
// Run: node --env-file=.env.local scripts/seed-telekhata-rates.mjs
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});
const db = mongoose.connection.db;
const now = new Date();

// a share of the margin over the purchase price, whole taka
const rate = (cost, retail, share) => Math.round(cost + (retail - cost) * share);

for (const product of await db.collection("products").find({ slug: /^tk-demo-/, deletedAt: null }).toArray()) {
  const cost = Number(product.purchasePrice) || 0;
  const retail = Number(product.sellingPrice) || 0;

  const rates = {
    dealerPrice: rate(cost, retail, 0.25),
    subDealerPrice: rate(cost, retail, 0.375),
    wholesalerPrice: rate(cost, retail, 0.5),
  };

  const set = Object.fromEntries(Object.entries(rates).filter(([key]) => !product[key]));
  if (!Object.keys(set).length) continue;

  await db.collection("products").updateOne({ _id: product._id }, { $set: { ...set, updatedAt: now } });

  for (const key of Object.keys(set)) {
    await db
      .collection("productvariants")
      .updateMany({ product: product._id, [key]: 0 }, { $set: { [key]: set[key], updatedAt: now } });
  }

  console.log(product.name, "cost", cost, "dealer", rates.dealerPrice, "sub", rates.subDealerPrice, "wholesaler", rates.wholesalerPrice, "retail", retail);
}

await mongoose.disconnect();
