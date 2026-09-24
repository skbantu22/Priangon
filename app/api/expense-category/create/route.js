import { NextResponse } from "next/server";
import ExpenseCategoryModel from "@/models/ExpenseCategory.model";
import { connectDB } from "@/lib/databaseconnection";

export async function POST(req) {
  try {
    await connectDB();

    const body = await req.json();
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Category name is required" },
        { status: 400 },
      );
    }

    const existing = await ExpenseCategoryModel.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: existing.deletedAt
            ? "This category is in the trash. Restore it instead."
            : "Category already exists",
        },
        { status: 409 },
      );
    }

    const category = await ExpenseCategoryModel.create({
      name,
      isActive: body.isActive !== false,
    });

    return NextResponse.json(
      { success: true, data: category },
      { status: 201 },
    );
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Category already exists" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
