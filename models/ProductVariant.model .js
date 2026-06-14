import mongoose from "mongoose";

const producVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    color: { type: String, required: true, trim: true },
    size: { type: String, required: true, trim: true },

    // ✅ PRICE SOURCE SYSTEM (MAIN FEATURE)
    priceSource: {
      type: String,
      enum: ["PRODUCT", "CUSTOM"],
      default: "PRODUCT",
      index: true,
    },

    // ✅ Prices (can be inherited or custom)
    mrp: { type: Number, min: 0, default: 0 },
    sellingPrice: { type: Number, min: 0, default: 0 },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // SKU (unique per variant)
    sku: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    // Barcode (optional auto/scan)
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

    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        required: true,
      },
    ],

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

/* ======================================================
   UNIQUE VARIANT (product + color + size)
====================================================== */
producVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

/* ======================================================
   AUTO DISCOUNT CALCULATION
====================================================== */
producVariantSchema.pre("save", function () {
  const mrp = Number(this.mrp) || 0;
  const selling = Number(this.sellingPrice) || 0;

  if (mrp > 0 && selling >= 0) {
    const pct = ((mrp - selling) / mrp) * 100;

    this.discountPercentage = Math.max(0, Math.min(100, Math.round(pct)));
  }
});

/* ======================================================
   LINK VARIANT → PRODUCT
====================================================== */
producVariantSchema.post("save", async function (doc) {
  try {
    if (!doc.product) return;

    await mongoose.model("Product").findByIdAndUpdate(doc.product, {
      $addToSet: { variants: doc._id },
    });
  } catch (err) {
    console.error("Error linking variant to product:", err);
  }
});

/* ======================================================
   REMOVE VARIANT LINK FROM PRODUCT
====================================================== */
producVariantSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (doc?.product) {
      await mongoose.model("Product").findByIdAndUpdate(doc.product, {
        $pull: { variants: doc._id },
      });
    }
  } catch (err) {
    console.error("Error removing variant from product:", err);
  }
});

/* ======================================================
   MODEL EXPORT
====================================================== */
const ProductVariantModel =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", producVariantSchema, "productvariants");

export default ProductVariantModel;
