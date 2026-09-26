import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Goods a customer brings back from a POS sale. The units go back into
 * the branch they were sold from, and the return total comes off what the
 * customer owes (customerBalances counts it). Cash handed back at once is
 * a "pay" customer payment (refundPaymentId).
 */
const saleReturnItemSchema = new mongoose.Schema(
  {
    line: { type: Number, required: true, min: 0 }, // row of the sale
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },
    productName: { type: String, trim: true, default: "" },
    color: { type: String, default: "" },
    size: { type: String, default: "" },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    // what one unit cost when it was sold, so profit reports can undo it
    purchasePrice: { type: Number, default: 0, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    imeis: { type: [String], default: [] },
  },
  { _id: false },
);

const saleReturnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, required: true, unique: true, trim: true, index: true },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "POSOrder", required: true, index: true },
    orderNumber: { type: String, trim: true, default: "" },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", default: null, index: true },
    customerName: { type: String, trim: true, default: "" },
    customerType: { type: String, default: "retail" },
    phone: { type: String, trim: true, default: "" },
    showroomId: { type: mongoose.Schema.Types.ObjectId, ref: "Showroom", default: null },
    returnDate: { type: Date, default: Date.now, index: true },
    items: {
      type: [saleReturnItemSchema],
      validate: { validator: (items) => items.length > 0, message: "A return needs at least one item" },
    },
    total: { type: Number, default: 0, min: 0 },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: { type: String, default: "cash" },
    refundPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomerPayment", default: null },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

saleReturnSchema.plugin(activityLog, { module: "Sale Return", label: "returnNumber" });

export default mongoose.models.SaleReturn || mongoose.model("SaleReturn", saleReturnSchema, "sale_returns");
