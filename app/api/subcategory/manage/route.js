import { NextResponse } from "next/server";
import mongoose from "mongoose";
import slugify from "slugify";

import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_ONLY } from "@/lib/apiAuth";
import SubCategoryModel from "@/models/subcategory.model";

// One endpoint for the sub category list actions:
// { action: "update", id, categoryId, name } | { action: "toggle", id, isActive } | { action: "delete", id }
export async function PUT(request) {
  const auth = await requireRoles(ADMIN_ONLY);
  if (auth.response) return auth.response;

  try {
    await connectDB();
    const body = await request.json();
    const { action, id } = body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid sub category" }, { status: 400 });
    }

    const row = await SubCategoryModel.findOne({ _id: id, deletedAt: null });
    if (!row) {
      return NextResponse.json({ success: false, message: "Sub category not found" }, { status: 404 });
    }

    if (action === "toggle") {
      row.isActive = Boolean(body.isActive);
      await row.save();
      return NextResponse.json({ success: true, message: row.isActive ? "Sub category activated" : "Sub category deactivated" });
    }

    if (action === "delete") {
      row.deletedAt = new Date();
      await row.save();
      return NextResponse.json({ success: true, message: "Sub category deleted" });
    }

    if (action === "update") {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
      }
      const categoryId = body.categoryId || row.categoryId;
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return NextResponse.json({ success: false, message: "Valid category required" }, { status: 400 });
      }
      row.name = name;
      row.slug = slugify(name, { lower: true, strict: true });
      row.categoryId = categoryId;
      await row.save();
      return NextResponse.json({ success: true, message: "Sub category updated successfully" });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error) {
    if (error.code === 11000) {
      return NextResponse.json({ success: false, message: "Subcategory already exists" }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
