import mongoose from "mongoose";

const productVariantSchema = new mongoose.Schema(
  {
    // ================= PRODUCT LINK =================
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    // ================= ATTRIBUTES =================
    color: {
      type: String,
      required: true,
      trim: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
    },

    // ================= PRICING =================
    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

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

    // ================= IDENTIFIERS =================
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
    sold: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ================= STATUS =================
    isActive: {
      type: Boolean,
      default: true,
    },

    // ================= MEDIA =================
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

    // ================= SOFT DELETE =================
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// ================= UNIQUE VARIANT RULE =================
productVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

// ================= AUTO DISCOUNT CALC =================
productVariantSchema.pre("save", function () {
  if (this.mrp > 0 && this.sellingPrice >= 0) {
    const pct = ((this.mrp - this.sellingPrice) / this.mrp) * 100;

    this.discountPercentage = Math.max(0, Math.min(100, Math.round(pct)));
  }
});

// ================= LINK TO PRODUCT =================
productVariantSchema.post("save", async function (doc) {
  try {
    if (!doc.product) return;

    await mongoose.model("Product").findByIdAndUpdate(doc.product, {
      $addToSet: { variants: doc._id },
    });
  } catch (err) {
    console.error("Error linking variant to product:", err);
  }
});

// ================= REMOVE LINK =================
productVariantSchema.post("findOneAndDelete", async function (doc) {
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

// ================= EXPORT =================
const ProductVariantModel =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", productVariantSchema, "productvariants");

export default ProductVariantModel;
