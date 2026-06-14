import { connectDB } from "@/lib/databaseconnection";

export async function getNextInvoiceNumber(type = "order") {
  const mongooseInstance = await connectDB();

  const db = mongooseInstance?.connection?.db || mongooseInstance?.db;

  if (!db) {
    throw new Error("Database connection object (db) not found.");
  }

  const counterCollection = db.collection("counters");

  const result = await counterCollection.findOneAndUpdate(
    { name: type }, // 🔥 IMPORTANT: dynamic counter
    { $inc: { seq: 1 } },
    {
      returnDocument: "after",
      upsert: true,
    },
  );

  const updatedDoc = result?.value || result;

  if (!updatedDoc || typeof updatedDoc.seq !== "number") {
    throw new Error("Failed to generate invoice number.");
  }

  return updatedDoc.seq;
}
