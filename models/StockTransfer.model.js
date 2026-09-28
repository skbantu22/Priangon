import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Goods leaving the warehouse for the sale center.
 *
 * Stock leaves the warehouse when the transfer is saved, and lands on the
 * sale-center shelf only when that transfer is received. Until then the
 * units are in transit and are not for sale.
 */
const stockTransferItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    productName: { type: String, trim: true, default: "" },
    variantLabel: { type: String, trim: true, default: "" },
    sku: { type: String, trim: true, default: "" },

    quantity: { type: Number, required: true, min: 1 },

    previousStock: { type: Number, default: 0 },
    newStock: { type: Number, default: 0 },
  },
  { _id: false },
);

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    transferDate: { type: Date, default: Date.now, index: true },

    fromName: { type: String, trim: true, default: "Warehouse" },

    toId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: true,
      index: true,
    },

    toName: { type: String, trim: true, default: "" },

    items: {
      type: [stockTransferItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "A transfer needs at least one item",
      },
    },

    totalQuantity: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "received"],
      default: "pending",
      index: true,
    },

    receivedAt: { type: Date, default: null },
    receivedBy: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

stockTransferSchema.plugin(activityLog, { module: "Stock Transfer", label: "transferNumber" });

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
