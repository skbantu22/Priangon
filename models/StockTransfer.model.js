import mongoose from "mongoose";

const stockTransferSchema = new mongoose.Schema(
  {
    fromType: {
      type: String,
      enum: ["WAREHOUSE", "SHOWROOM"],
      required: true,
    },

    fromId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    toType: {
      type: String,
      enum: ["WAREHOUSE", "SHOWROOM"],
      required: true,
    },

    toId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

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

    quantity: {
      type: Number,
      required: true,
    },

    note: String,

    createdBy: String,
  },
  { timestamps: true },
);

export default mongoose.models.StockTransfer ||
  mongoose.model("StockTransfer", stockTransferSchema);
