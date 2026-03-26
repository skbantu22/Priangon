import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },

    mrp: { type: Number, required: true, min: 0 },

    sellingPrice: { type: Number, required: true, min: 0 },

    discountPercentage: { type: Number, min: 0, max: 100 },

    offers: {
      type: [String],
      enum: ["mega", "new", "top", "free", "valentine"],
      default: [],
    },

    freeDelivery: { type: Boolean, default: false },

    media: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Media", required: true },
    ],

    description: { type: String, required: true },
    color: { type: String },
    size: { type: String }, // Or [String] if you allow multiple
    sizeChart: { type: mongoose.Schema.Types.ObjectId, ref: "Media" }, // Links to the image ID
    // ✅ Variants field with default empty array
    variants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductVariant",
        },
      ],
      default: [],
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

// Indexes
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ offers: 1 });

const ProductModel =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema, "products");

export default ProductModel;
