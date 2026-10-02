import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import CategoryModel from "@/models/category.model";

// Activate / deactivate one category
export async function PUT(request) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const { id, isActive } = await request.json();
    const row = await CategoryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { isActive: Boolean(isActive) },
      { new: true },
    );
    if (!row) return NextResponse.json({ success: false, message: "Category not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: row.isActive ? "Category activated" : "Category deactivated" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
