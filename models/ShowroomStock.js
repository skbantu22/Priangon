import mongoose from "mongoose";

const showroomStockSchema = new mongoose.Schema(
  {
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
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

    stock: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

showroomStockSchema.index(
  {
    showroomId: 1,
    productId: 1,
    variantId: 1,
  },
  {
    unique: true,
  },
);

const ShowroomStock =
  mongoose.models.ShowroomStock ||
  mongoose.model("ShowroomStock", showroomStockSchema);

export default ShowroomStock;
