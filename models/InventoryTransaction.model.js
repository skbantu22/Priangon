import mongoose from "mongoose";

const inventoryTransactionSchema = new mongoose.Schema(
  {
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: false,
      default: null,
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

    type: {
      type: String,
      enum: [
        "OPENING",
        "IN",
        "OUT",
        "SALE",
        "RETURN",
        "ADJUSTMENT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "DAMAGE",
      ],
      required: true,
    },

    quantity: Number,

    previousStock: Number,

    newStock: Number,

    note: String,

    createdBy: String,
  },
  {
    timestamps: true,
  },
);

export default mongoose.models.InventoryTransaction ||
  mongoose.model("InventoryTransaction", inventoryTransactionSchema);
