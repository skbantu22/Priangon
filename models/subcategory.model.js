import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    slug: { type: String, required: true, lowercase: true, trim: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

subCategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

const SubCategoryModel =
  mongoose.models.Subcategory ||
  mongoose.model("Subcategory", subCategorySchema, "subcategories");

export default SubCategoryModel;
