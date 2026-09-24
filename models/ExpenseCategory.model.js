import mongoose from "mongoose";

const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

const ExpenseCategoryModel =
  mongoose.models.ExpenseCategory ||
  mongoose.model("ExpenseCategory", expenseCategorySchema, "expensecategories");

export default ExpenseCategoryModel;
