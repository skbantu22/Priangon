import mongoose from "mongoose";

const warehouseStockSchema = new mongoose.Schema(
  {
    // Product Reference
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // Variant Reference
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },

    // Mother Stock Quantity
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional Reserved Stock
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate product + variant entries
warehouseStockSchema.index(
  {
    productId: 1,
    variantId: 1,
  },
  {
    unique: true,
  },
);

const WarehouseStock =
  mongoose.models.WarehouseStock ||
  mongoose.model("WarehouseStock", warehouseStockSchema);

export default WarehouseStock;
