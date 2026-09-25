import { NextResponse } from "next/server";
import mongoose from "mongoose";

import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { readExpense } from "@/lib/expenseService";

export async function PUT(req, { params }) {
  try {
    const auth = await requirePermission("expenses.edit");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    }

    const { data, error } = await readExpense(await req.json());

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    const expense = await ExpenseModel.findOneAndUpdate({ _id: id, deletedAt: null }, data, {
      new: true,
      runValidators: true,
    });

    if (!expense) {
      return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Expense updated", data: expense });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
