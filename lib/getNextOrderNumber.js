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

/**
 * The number getNextInvoiceNumber would hand out next, without using it
 * up — for showing "PUR-15" on a blank form. Someone else may save first,
 * so the saved document can still end up with a later number.
 */
export async function peekInvoiceNumber(type = "order") {
  const mongooseInstance = await connectDB();

  const db = mongooseInstance?.connection?.db || mongooseInstance?.db;

  if (!db) {
    throw new Error("Database connection object (db) not found.");
  }

  const counter = await db.collection("counters").findOne({ name: type });

  return (Number(counter?.seq) || 0) + 1;
}
