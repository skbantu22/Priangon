// Demo supplier payments (Due Paid / Due Dismiss / Advance / Due Received) on top of the
// IN-DEMO-* purchases made by scripts/seed-telekhata-purchases.mjs. Safe to run twice.
// Run: node --env-file=.env.local scripts/seed-supplier-payments.mjs
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI, {
  dbName: process.env.MONGODB_DB || "MobiZone",
});
const db = mongoose.connection.db;
const now = new Date();
const day = (text) => new Date(`${text}T12:00:00+06:00`);
const round = (value) => Math.round(value * 100) / 100;

// [invoice, type, purchase number (or supplier purchase for advance/receive), amount, method, date, note]
const rows = [
  ["IN-17905752100009", "pay", "IN-17903160010000", 750, "cash", "2026-09-28", "Part payment"],
  ["IN-17907480110000", "pay", "IN-17904888020001", 1000, "bkash", "2026-09-30", "bKash to supplier"],
  ["IN-17909208120001", "pay", "IN-17908344040003", 480, "cash", "2026-10-02", ""],
  ["IN-17909208130002", "dismiss", "IN-17909208050004", 200, "other", "2026-10-02", "Discount given by supplier"],
  ["IN-17908344140003", "advance", "IN-17906616030002", 1000, "cash", "2026-10-01", "Paid ahead for the next order"],
  ["IN-17909208150004", "receive", "IN-17906616030002", 400, "cash", "2026-10-02", "Supplier returned part of the advance"],
];

for (const [invoiceNo, type, number, amount, method, date, note] of rows) {
  if (await db.collection("supplierpayments").findOne({ invoiceNo })) continue;

  const purchase = await db.collection("purchases").findOne({ purchaseNumber: number });
  if (!purchase) throw new Error(`${number} is missing; run scripts/seed-telekhata-purchases.mjs first`);

  const when = day(date);
  const share = type === "pay" || type === "dismiss";

  if (share && amount - purchase.dueAmount > 0.009) {
    console.log("skip", invoiceNo, "- only", purchase.dueAmount, "is due on", number);
    continue;
  }

  const paymentId = new mongoose.Types.ObjectId();

  await db.collection("supplierpayments").insertOne({
    _id: paymentId,
    invoiceNo,
    supplierId: purchase.supplierId,
    type,
    amount,
    method,
    reference: "",
    allocations: share ? [{ purchaseId: purchase._id, purchaseNumber: number, amount }] : [],
    date: when,
    note,
    createdBy: "demo",
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  if (share) {
    const payments = [...(purchase.payments || [])];
    let dismissAmount = Number(purchase.dismissAmount || 0);

    if (type === "pay") {
      payments.push({
        _id: new mongoose.Types.ObjectId(),
        amount,
        method,
        reference: "",
        note: `Supplier payment ${invoiceNo}`,
        paidAt: when,
        createdBy: "demo",
        supplierPaymentId: paymentId,
      });
    } else {
      dismissAmount = round(dismissAmount + amount);
    }

    const paid = round(payments.reduce((sum, row) => sum + Number(row.amount || 0), 0));
    const due = round(purchase.grandTotal - paid - dismissAmount);

    await db.collection("purchases").updateOne(
      { _id: purchase._id },
      {
        $set: {
          payments,
          dismissAmount,
          paidAmount: paid,
          dueAmount: due,
          paymentStatus: due <= 0 ? "paid" : paid <= 0 && !dismissAmount ? "unpaid" : "partial",
          updatedAt: now,
        },
      },
    );
  }

  console.log(type, "+", invoiceNo, amount);
}

console.log("done");
await mongoose.disconnect();
