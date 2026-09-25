import { NextResponse } from "next/server";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requirePermission("expenses.delete");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const expense = await ExpenseModel.findOne({ _id: id, deletedAt: null });

    if (!expense) {
      return NextResponse.json(
        { success: false, message: "Expense not found" },
        { status: 404 },
      );
    }

    expense.deletedAt = new Date();
    await expense.save();

    return NextResponse.json({
      success: true,
      message: "Expense moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
