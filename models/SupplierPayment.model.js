import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Money moving between the shop and a supplier outside a purchase screen.
 *
 * pay            — we pay what we owe
 * receive        — the supplier hands money back to us
 * dismiss        — the supplier lets part of the due go
 * advance        — we pay ahead of any purchase
 * advance_refund — the supplier returns part of an advance
 *
 * A pay or a dismiss can be spread over purchases still due; each share is
 * written onto that purchase as well, so the purchase list and the
 * supplier's balance read the same.
 */
const allocationSchema = new mongoose.Schema(
  {
    purchaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },
    purchaseNumber: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const supplierPaymentSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["pay", "receive", "dismiss", "advance", "advance_refund"],
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

supplierPaymentSchema.plugin(activityLog, { module: "Supplier Payment", label: "invoiceNo" });

export default mongoose.models.SupplierPayment ||
  mongoose.model("SupplierPayment", supplierPaymentSchema);
