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

producVariantSchema.index({ product: 1, color: 1, size: 1 }, { unique: true });

// ✅ auto-calc discount
producVariantSchema.pre("save", async function () {
  // 'this' refers to the document being saved. 
  // No 'next' parameter is needed for async middleware.
  
  if (this.mrp > 0 && this.sellingPrice >= 0) {
    const pct = ((this.mrp - this.sellingPrice) / this.mrp) * 100;
    this.discountPercentage = Math.max(0, Math.min(100, Math.round(pct)));
  }
  
  // Mongoose automatically moves forward when the async function finishes.
});

const ProductVariantModel =
  mongoose.models.ProductVariant ||
  mongoose.model("ProductVariant", producVariantSchema, "productvariants");

export default ProductVariantModel;
