import { NextResponse } from "next/server";
import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";

export async function DELETE(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const category = await ExpenseCategoryModel.findOne({
      _id: id,
      deletedAt: null,
    });

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    const inUse = await ExpenseModel.countDocuments({
      categoryId: id,
      deletedAt: null,
    });

    if (inUse > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `${inUse} expense(s) use this category. Mark it inactive instead.`,
        },
        { status: 409 },
      );
    }

    category.deletedAt = new Date();
    await category.save();

    return NextResponse.json({
      success: true,
      message: "Category moved to trash",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
