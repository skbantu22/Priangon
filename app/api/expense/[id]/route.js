import { NextResponse } from "next/server";
import mongoose from "mongoose";

import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

/** One expense, for the edit form */
export async function GET(req, { params }) {
  try {
    const auth = await requirePermission("expenses.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params;

    const expense = mongoose.isValidObjectId(id)
      ? await ExpenseModel.findOne({ _id: id, deletedAt: null }).lean()
      : null;

    if (!expense) {
      return NextResponse.json({ success: false, message: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: expense });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
