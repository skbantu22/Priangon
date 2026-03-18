import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import CategoryModel from "@/models/category.model";
import SubCategoryModel from "@/models/subcategory.model";
import slugify from "slugify";

export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();

    const categoryId = body?.categoryId || body?.category;
    const nameRaw = (body?.name || body?.subcategory || "").trim();

    if (!categoryId || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return NextResponse.json(
        { success: false, message: "Valid category required" },
        { status: 400 }
      );
    }

    if (!nameRaw) {
      return NextResponse.json(
        { success: false, message: "Subcategory name required" },
        { status: 400 }
      );
    }

    const slug =
      (body?.slug || "").trim().toLowerCase() ||
      slugify(nameRaw, { lower: true, strict: true });

    // ✅ Category exists
    const cat = await CategoryModel.findOne({ _id: categoryId, deletedAt: null });
    if (!cat) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    // ✅ Duplicate check (same category)
    const exists = await SubCategoryModel.findOne({
      categoryId,
      deletedAt: null,
      $or: [
        { name: { $regex: `^${nameRaw}$`, $options: "i" } }, // ✅ use name
        { slug: { $regex: `^${slug}$`, $options: "i" } },
      ],
    });

    if (exists) {
      return NextResponse.json(
        { success: false, message: "Subcategory already exists" },
        { status: 409 }
      );
    }

    // ✅ CREATE (must include name)
    const created = await SubCategoryModel.create({
      categoryId,
      name: nameRaw, // ✅ required
      slug,
      deletedAt: null,
    });

    // (optional) link to Category
    await CategoryModel.findByIdAndUpdate(categoryId, {
      $addToSet: { subcategories: created._id },
    });

    return NextResponse.json(
      { success: true, message: "Subcategory created successfully", data: created },
      { status: 201 }
    );
  } catch (error) {
    console.error("SUBCATEGORY CREATE ERROR:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
