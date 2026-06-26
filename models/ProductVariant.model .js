import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },

    // =========================
    // PRICE SYSTEM
    // =========================
    priceSource: {
      type: String,
      enum: ["PRODUCT", "CUSTOM"],
      default: "PRODUCT",
      index: true,
    },

    mrp: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // =========================
    // IDENTIFIERS
    // =========================
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    barcode: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    stock: { type: Number, required: true, min: 0, default: 0 },
    sold: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },

    // =========================
    // 📸 MEDIA (images + mixed support)
    // =========================
    media: [
      {
        type: mongoose.Schema.Types.Mixed,
        // supports:
        // - Media ObjectId
        // - image URL string
        // - any mixed file reference
      },
    ],

    // =========================
    // 🎥 VIDEOS (NEW)
    // =========================
    videos: [
      {
        url: { type: String, required: true },

        type: {
          type: String,
          enum: ["mp4", "youtube", "url"],
          default: "url",
        },

        thumbnail: {
          type: String,
          default: null,
        },
      },
    ],

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

/* =========================
   UNIQUE VARIANT INDEX
========================= */
productVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

/* =========================
   AUTO DISCOUNT CALCULATION
========================= */
productVariantSchema.pre("save", function () {
  const mrp = Number(this.mrp) || 0;
  const selling = Number(this.sellingPrice) || 0;

  if (mrp > 0) {
    const percent = ((mrp - selling) / mrp) * 100;

    this.discountPercentage = Math.max(0, Math.min(100, Math.round(percent)));
  }
});

const ProductVariantModel =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", productVariantSchema, "productvariants");

export default ProductVariantModel;
