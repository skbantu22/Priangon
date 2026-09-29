import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * Goods in transit between shops.
 *
 * Source stock leaves on send. Destination stock lands when Received List
 * confirms. Rows with destinationStockApplied already true (legacy sends)
 * only update status on confirm — stock is not applied twice.
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

    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      default: null,
      index: true,
    },

    fromName: { type: String, trim: true, default: "" },

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
      enum: ["pending", "received", "rejected"],
      default: "pending",
      index: true,
    },

    /** True once destination stock was applied (legacy send-time or after receive) */
    destinationStockApplied: { type: Boolean, default: false },

    receivedAt: { type: Date, default: null },
    receivedBy: { type: String, trim: true, default: "" },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

stockTransferSchema.plugin(activityLog, { module: "Stock Transfer", label: "transferNumber" });

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
