import mongoose from "mongoose";

/**
 * Stock moving from one place to another.
 *
 * A transfer leaves the source the moment it is sent and only lands at
 * the destination when someone there receives it — in between, the units
 * belong to neither side, which is what the transferred and received
 * lists are for. Rejecting a transfer puts the units back where they
 * came from.
 *
 * Older rows were written one product at a time with the product held at
 * the top level; those fields are still read, so nothing already saved
 * disappears from the list.
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

    // What the receiving side actually counted in
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    fromType: {
      type: String,
      enum: ["WAREHOUSE", "SHOWROOM"],
      required: true,
    },

    // Null for the warehouse — there is only one mother stock
    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    fromName: { type: String, trim: true, default: "" },

    toType: {
      type: String,
      enum: ["WAREHOUSE", "SHOWROOM"],
      required: true,
    },

    toId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    toName: { type: String, trim: true, default: "" },

    items: { type: [stockTransferItemSchema], default: [] },

    totalQuantity: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "received", "rejected"],
      default: "pending",
      index: true,
    },

    transferDate: { type: Date, default: Date.now, index: true },

    receivedAt: { type: Date, default: null },
    receivedBy: { type: String, trim: true, default: "" },

    rejectedAt: { type: Date, default: null },
    rejectReason: { type: String, trim: true, default: "" },

    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    deletedAt: { type: Date, default: null, index: true },

    // ===== legacy single-item fields, kept so old rows still read =====
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },

    quantity: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
