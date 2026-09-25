import { NextResponse } from "next/server";
import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";

export async function GET(req) {
  try {
    const auth = await requirePermission("expenses.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const filter = { deletedAt: null };

    if (searchParams.get("active") === "true") filter.isActive = true;

    const categories = await ExpenseCategoryModel.find(filter).sort({
      name: 1,
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
