import { NextResponse } from "next/server";
import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import ExpenseModel from "@/models/Expense.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import { exactRegex } from "@/lib/escapeRegex";

export async function PUT(req, { params }) {
  try {
    const auth = await requireRoles(ADMIN_ONLY);
    if (auth.response) return auth.response;

    await connectDB();

    const { id } = await params; // ✅ Next.js 15/16

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 },
      );
    }

    const duplicate = await ExpenseCategoryModel.findOne({
      _id: { $ne: id },
      name: exactRegex(name),
    });

    if (duplicate) {
      return NextResponse.json(
        { success: false, message: "Another category already uses this name" },
        { status: 409 },
      );
    }

    const category = await ExpenseCategoryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { name, isActive: body.isActive !== false },
      { new: true, runValidators: true },
    );

    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 },
      );
    }

    // Old vouchers carry the name, so keep them readable after a rename
    await ExpenseModel.updateMany(
      { categoryId: category._id },
      { categoryName: category.name },
    );

    return NextResponse.json({ success: true, data: category });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
