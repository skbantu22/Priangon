import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    
     subcategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },
  ],

    isActive: { type: Boolean, default: true },

    // Showroom that owns this category ("warehouse" or a showroom id).
    // Older categories without it belong to the warehouse.
    showroomId: { type: String, default: "warehouse", index: true },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index:true
    },
  },
  { timestamps: true }
);

categorySchema.index({ name: 1, showroomId: 1 }, { unique: true });
categorySchema.index({ slug: 1, showroomId: 1 }, { unique: true });

const CategoryModel =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema, "categories");

export default CategoryModel;
