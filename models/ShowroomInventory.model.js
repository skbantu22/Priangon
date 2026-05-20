import mongoose from "mongoose";
const showroomInventorySchema = new mongoose.Schema(
  {
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      required: true,
      index: true,
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
      index: true,
    },

    stock: {
      type: Number,
      default: 0,
    },

    reservedStock: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// fast lookup
showroomInventorySchema.index({
  showroomId: 1,
  variantId: 1,
});

export default mongoose.models.ShowroomInventory ||
  mongoose.model("ShowroomInventory", showroomInventorySchema);
