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

    mrp: { type: Number, required: true, min: 0 },

    sellingPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (v) {
          return v <= this.mrp;
        },
        message: "Selling price cannot exceed MRP",
      },
    },

    discountPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    sku: { type: String, required: true, unique: true, index: true },

    stock: { type: Number, required: true, min: 0, default: 0 },
    sold: { type: Number, default: 0, min: 0 },

    isActive: { type: Boolean, default: true },

    media: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Media", required: true },
    ],

    description: { type: String, required: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

// Unique combination of product + color + size
producVariantSchema.index(
  { product: 1, color: 1, size: 1 },
  { unique: true }
);

//
// 🔹 PRE SAVE: AUTO CALCULATE DISCOUNT (async-safe)
//
producVariantSchema.pre("save", function () {
  if (this.mrp > 0 && this.sellingPrice >= 0) {
    const pct = ((this.mrp - this.sellingPrice) / this.mrp) * 100;
    this.discountPercentage = Math.max(0, Math.min(100, Math.round(pct)));
  }
  // ✅ no next() needed because this is not async
});

//
// 🔹 POST SAVE: AUTO PUSH VARIANT → PRODUCT
//
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

//
// 🔹 POST DELETE: REMOVE VARIANT FROM PRODUCT
// (optional; use only if you want Product.variants to stay clean)
//
producVariantSchema.post("findOneAndDelete", async function (doc) {
  try {
    if (doc && doc.product) {
      await mongoose.model("Product").findByIdAndUpdate(doc.product, {
        $pull: { variants: doc._id },
      });
    }
  } catch (err) {
    console.error("Error removing variant from product:", err);
  }
});

const ProductVariantModel =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", producVariantSchema, "productvariants");

export default ProductVariantModel;