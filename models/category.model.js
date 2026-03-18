import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    
     subcategories: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subcategory",
    },
  ],

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index:true
    },
  },
  { timestamps: true }
);

const CategoryModel =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema, "categories");

export default CategoryModel;
