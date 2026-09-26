import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Goods sent back to a supplier. The units leave warehouse stock, and the
 * return total comes off what the shop owes that supplier. Money the
 * supplier hands back at once is kept as a "receive" supplier payment
 * (refundPaymentId), so the balance reads: due − return total + refund.
 */
const returnItemSchema = new mongoose.Schema(
  {
    purchaseId: { type: mongoose.Schema.Types.ObjectId, ref: "Purchase", required: true },
    purchaseNumber: { type: String, default: "" },
    // which row of that purchase, so its returned count can be put back
    purchaseLine: { type: Number, default: 0, min: 0 },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
    productName: { type: String, trim: true, default: "" },
    variantLabel: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    // the return type (damaged, wrong item...) and its name as it was then
    returnTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseReturnType", default: null },
    reason: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true, index: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    supplierName: { type: String, trim: true, default: "" },
    returnDate: { type: Date, default: Date.now, index: true },
    items: {
      type: [returnItemSchema],
      validate: { validator: (items) => items.length > 0, message: "A return needs at least one item" },
    },
    total: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: { type: String, default: "cash" },
    refundPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "SupplierPayment", default: null },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

purchaseReturnSchema.plugin(activityLog, { module: "Purchase Return", label: "returnNumber" });

export default mongoose.models.PurchaseReturn ||
  mongoose.model("PurchaseReturn", purchaseReturnSchema, "purchase_returns");
