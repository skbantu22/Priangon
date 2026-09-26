import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

/**
 * A correction to a stock figure that no sale, purchase or transfer
 * explains — breakage, theft, a miscount found during an audit.
 *
 * The rows keep the figures from the moment the adjustment was saved, so
 * the paper trail still reads correctly after later movements.
 */
const stockAdjustmentItemSchema = new mongoose.Schema(
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

    // "add" puts units in, "subtract" takes them out
    type: {
      type: String,
      enum: ["add", "subtract"],
      required: true,
    },

    quantity: { type: Number, required: true, min: 1 },

    previousStock: { type: Number, default: 0 },
    newStock: { type: Number, default: 0 },
  },
  { _id: false },
);

const stockAdjustmentSchema = new mongoose.Schema(
  {
    adjustmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Where the units were counted. A warehouse adjustment carries no id,
    // because there is only one mother stock.
    locationType: {
      type: String,
      enum: ["WAREHOUSE", "SHOWROOM"],
      required: true,
      index: true,
    },

    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      default: null,
      index: true,
    },

    locationName: { type: String, trim: true, default: "" },

    adjustmentDate: { type: Date, default: Date.now, index: true },

    reason: {
      type: String,
      enum: ["damage", "lost", "theft", "expired", "found", "correction", "other"],
      default: "correction",
      index: true,
    },

    items: {
      type: [stockAdjustmentItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "An adjustment needs at least one item",
      },
    },

    totalAdded: { type: Number, default: 0 },
    totalSubtracted: { type: Number, default: 0 },

    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

stockAdjustmentSchema.plugin(activityLog, { module: "Stock Adjustment", label: "adjustmentNumber" });

export default mongoose.models.StockAdjustment ||
  mongoose.model("StockAdjustment", stockAdjustmentSchema);
