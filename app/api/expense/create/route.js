import { NextResponse } from "next/server";
import mongoose from "mongoose";

import ExpenseModel from "@/models/Expense.model";
import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import { connectDB } from "@/lib/databaseconnection";
import { getNextInvoiceNumber } from "@/lib/getNextOrderNumber";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();

    if (!mongoose.isValidObjectId(body.categoryId)) {
      return NextResponse.json(
        { success: false, message: "Select a category" },
        { status: 400 },
      );
    }

    const category = await ExpenseCategoryModel.findOne({
      _id: body.categoryId,
      deletedAt: null,
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    const title = body.title?.trim();
    const amount = Number(body.amount);

    if (!title) {
      return NextResponse.json(
        { success: false, message: "Write what the money was spent on" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Enter an amount more than zero" },
        { status: 400 },
      );
    }

    const seq = await getNextInvoiceNumber("expense");

    const expense = await ExpenseModel.create({
      voucherNumber: `EXP-${seq}`,
      categoryId: category._id,
      categoryName: category.name,
      title,
      amount,
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : new Date(),
      paymentMethod: body.paymentMethod || "cash",
      reference: body.reference?.trim() || "",
      showroomId: mongoose.isValidObjectId(body.showroomId)
        ? body.showroomId
        : null,
      note: body.note?.trim() || "",
      createdBy: body.createdBy?.trim() || "",
    });

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
