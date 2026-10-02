import mongoose from "mongoose";

// One line of an account's statement. "in" adds to the balance, "out" takes from it.
export const TX_SOURCES = [
  "deposit",
  "withdraw",
  "transfer_in",
  "transfer_out",
  "sale",
  "purchase",
  "customer_payment",
  "supplier_payment",
  "expense",
  "telekhata",
];

const accountTxSchema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null, index: true },

    direction: { type: String, enum: ["in", "out"], required: true },
    amount: { type: Number, required: true, min: 0.01 },

    source: { type: String, enum: TX_SOURCES, required: true },
    // the sale / purchase / payment / transfer that caused it
    sourceId: { type: String, default: "", index: true },
    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },

    date: { type: Date, default: Date.now, index: true },
    createdBy: { type: String, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

accountTxSchema.index({ accountId: 1, date: 1 });

export default mongoose.models.AccountTx || mongoose.model("AccountTx", accountTxSchema, "accounttxs");
