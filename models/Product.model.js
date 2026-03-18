import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // ✅ Main Category (Mens, Womens etc.)
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    // ✅ Sub Category (Half Sleeve, Jacket etc.)
    subcategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
    },

    // ✅ Special Offers like Mega Deal, Top Selling etc.
    offers: {
      type: [String],
      enum: ["mega", "new", "top", "free", "valentine"],
      default: [],
    },

    // ✅ Free Delivery Filter
    freeDelivery: {
      type: Boolean,
      default: false,
    },

    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },
    ],

    description: {
      type: String,
      required: true,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

// ✅ Index for fast filtering
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ offers: 1 });

const ProductModel =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema, "products");

export default ProductModel;
