import { NextResponse } from "next/server";
import { longNumber } from "@/lib/documentNumber";

import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { actorFullName, requirePermission } from "@/lib/apiAuth";
import { readExpense } from "@/lib/expenseService";

export async function POST(req) {
  try {
    const auth = await requirePermission("expenses.create");
    if (auth.response) return auth.response;

    await connectDB();

    const { data, error } = await readExpense(await req.json());

    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    const expense = await ExpenseModel.create({
      ...data,
      voucherNumber: longNumber(),
      createdBy: await actorFullName(auth),
    });

    return NextResponse.json(
      { success: true, message: "Expense saved", data: expense },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
