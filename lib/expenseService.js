import mongoose from "mongoose";

import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import Showroom from "@/models/Showroom.model";

export const EXPENSE_METHODS = ["cash", "bkash", "nagad", "card", "bank", "cheque", "other"];

/** Today as yyyy-mm-dd in Bangladesh, where "today" is decided */
const todayBD = () =>
  new Date(Date.now() + 6 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Checks an expense form; shared by create and update. Returns
 * { data } ready to save, or { error } with a message for the screen.
 */
export async function readExpense(body) {
  if (!mongoose.isValidObjectId(body.categoryId)) return { error: "Select an expense type" };

  const category = await ExpenseCategoryModel.findOne({ _id: body.categoryId, deletedAt: null })
    .select("name")
    .lean();

  if (!category) return { error: "Expense type not found" };

  const amount = Math.round((Number(body.amount) || 0) * 100) / 100;

  if (!(amount > 0)) return { error: "Enter an amount greater than 0" };

  const day = String(body.expenseDate || "").slice(0, 10) || todayBD();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Pick a date" };
  if (day > todayBD()) return { error: "The date cannot be in the future" };

  let showroomId = null;

  if (mongoose.isValidObjectId(body.showroomId)) {
    if (!(await Showroom.exists({ _id: body.showroomId }))) return { error: "Showroom not found" };
    showroomId = body.showroomId;
  }

  return {
    data: {
      categoryId: category._id,
      categoryName: category.name,
      title: String(body.title || "").trim().slice(0, 200),
      amount,
      // noon, so the day never slips across midnight in another timezone
      expenseDate: new Date(`${day}T12:00:00+06:00`),
      paymentMethod: EXPENSE_METHODS.includes(body.paymentMethod) ? body.paymentMethod : "cash",
      reference: String(body.reference || "").trim().slice(0, 100),
      showroomId,
      note: String(body.note || "").trim().slice(0, 2000),
    },
  };
}
