// One-time: let each showroom keep its own categories and brands.
// Drops the old global unique indexes on name/slug and builds name+showroomId / slug+showroomId.
// Run: node --env-file=.env.local scripts/category-showroom-index.mjs
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});

for (const collection of ["categories", "brands"]) {
  const col = mongoose.connection.collection(collection);
  for (const name of ["name_1", "slug_1"]) {
    try { await col.dropIndex(name); console.log(collection, "dropped", name); } catch { console.log(collection, "skip", name); }
  }
  await col.updateMany({ showroomId: { $exists: false } }, { $set: { showroomId: "warehouse" } });
  await col.createIndex({ name: 1, showroomId: 1 }, { unique: true });
  await col.createIndex({ slug: 1, showroomId: 1 }, { unique: true });
}
console.log("done");
await mongoose.disconnect();
