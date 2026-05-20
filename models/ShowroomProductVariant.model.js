import mongoose from "mongoose";

const showroomProductVariantSchema = new mongoose.Schema(
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

    variants: [
      {
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
    ],
  },
  { timestamps: true },
);

const ShowroomProductVariant =
  mongoose.models.ShowroomProductVariant ||
  mongoose.model(
    "ShowroomProductVariant",
    showroomProductVariantSchema,
    "showroom_product_variants",
  );

export default ShowroomProductVariant;
