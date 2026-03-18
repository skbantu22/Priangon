import { connectDB } from "@/lib/databaseconnection";
import { NextResponse } from "next/server";

import CategoryModel from "@/models/category.model";
import SubcategoryModel from "@/models/subcategory.model"; // ✅ must import (register model)

export async function GET() {
  try {
    await connectDB();

    const getCategory = await CategoryModel
      .find({ deletedAt: null })
      .populate("subcategories", "subcategory slug") // ✅ get subcategory name + slug
      .lean();

    if (!getCategory || getCategory.length === 0) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Category found", data: getCategory },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
