import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});
const db = mongoose.connection.db;
const product = await db.collection("products").findOne(
  { name: /^Dummy Handset / },
  { projection: { name: 1 } },
);
const room = await db.collection("showrooms").findOne(
  { name: /^Test Showroom / },
  { projection: { name: 1, isActive: 1 } },
);
const order = await db.collection("posorders").findOne(
  { orderNumber: "IN-17905770266915" },
  { projection: { orderNumber: 1, total: 1, showroomId: 1 } },
);
console.log(JSON.stringify({
  product: product?.name || null,
  showroom: room ? { name: room.name, isActive: room.isActive } : null,
  order: order ? { orderNumber: order.orderNumber, total: order.total } : null,
}, null, 2));
await mongoose.disconnect();
