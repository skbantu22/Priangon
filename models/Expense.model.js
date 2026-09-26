import mongoose from "mongoose";
import { activityLog } from "@/lib/activityLog";

const expenseSchema = new mongoose.Schema(
  {
    voucherNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExpenseCategory",
      required: true,
      index: true,
    },

    // Kept on the row so an old voucher still reads correctly
    // after the category is renamed or deleted
    categoryName: { type: String, trim: true, default: "" },

    // what the money was spent on; the expense type is enough on its own
    title: { type: String, trim: true, default: "" },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be more than zero"],
    },

    expenseDate: { type: Date, default: Date.now, index: true },

    paymentMethod: {
      type: String,
      enum: ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"],
      default: "cash",
    },

    reference: { type: String, trim: true, default: "" },

    // Which outlet the cost belongs to, empty for head office
    showroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Showroom",
      default: null,
      index: true,
    },

    note: { type: String, trim: true, default: "" },
    createdBy: { type: String, trim: true, default: "" },

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true },
);

expenseSchema.plugin(activityLog, { module: "Expense", label: "voucherNumber" });

const ExpenseModel =
  mongoose.models.Expense ||
  mongoose.model("Expense", expenseSchema, "expenses");

export default ExpenseModel;
