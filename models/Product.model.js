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
      default: null,
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

    // =========================
    // 📸 PRODUCT IMAGES
    // =========================
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },
    ],

    // =========================
    // ⭐ REVIEW SCREENSHOTS (CLOUDINARY READY)
    // =========================
    reviewScreenshots: [
      {
        url: { type: String }, // Cloudinary secure_url
        public_id: { type: String }, // Cloudinary delete reference
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // =========================
    // 🎥 PRODUCT VIDEOS (OPTIONAL)
    // =========================
    videos: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["mp4", "youtube", "url"],
          default: "url",
        },
        thumbnail: { type: String, default: null },
      },
    ],

    description: { type: String, required: true },

    color: { type: String },
    size: { type: String },

    sizeChart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
    },

    // =========================
    // VARIANTS
    // =========================
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
