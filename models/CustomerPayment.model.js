import mongoose from "mongoose";

/**
 * Money moving between the shop and a customer outside the POS screen.
 *
 * receive        — the customer pays what they owe
 * pay            — the shop pays the customer (when the shop owes them)
 * dismiss        — the shop lets part of the due go
 * advance        — the customer pays ahead of any sale
 * advance_refund — the shop returns part of an advance
 *
 * A receive or a dismiss can be spread over POS invoices still due; each
 * share is written onto that invoice as well, so the order list and the
 * customer's balance read the same.
 */
const allocationSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "POSOrder",
      required: true,
    },
    orderNumber: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const customerPaymentSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["receive", "pay", "dismiss", "advance", "advance_refund"],
      required: true,
      index: true,
    },

    amount: { type: Number, required: true, min: 0 },

    method: {
      type: String,
      enum: ["cash", "bkash", "nagad", "bank", "cheque", "card", "other"],
      default: "cash",
    },

    reference: { type: String, trim: true, default: "" },

    allocations: { type: [allocationSchema], default: [] },

    date: { type: Date, default: Date.now, index: true },

    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export default mongoose.models.CustomerPayment ||
  mongoose.model("CustomerPayment", customerPaymentSchema);
