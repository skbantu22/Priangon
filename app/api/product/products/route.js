import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import CategoryModel from "@/models/category.model";
import SubCategoryModel from "@/models/subcategory.model";
import MediaModel from "@/models/Media.model";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const category = (searchParams.get("category") || "").trim(); // slug OR id
    const subcategory = searchParams
      .getAll("subcategory")
      .map((s) => String(s).trim())
      .filter(Boolean); // ✅ name is subcategory
    const q = (searchParams.get("q") || "").trim();

    const start = Math.max(parseInt(searchParams.get("start") || "0", 10), 0);
    const size = Math.min(
      Math.max(parseInt(searchParams.get("size") || "12", 10), 1),
      60,
    );

    const filter = { deletedAt: null };

    // ✅ category: id or slug
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = new mongoose.Types.ObjectId(category);
      } else {
        const catDoc = await CategoryModel.findOne({ slug: category })
          .select("_id")
          .lean();
        if (!catDoc?._id)
          return NextResponse.json({
            success: true,
            items: [],
            total: 0,
            start,
            size,
          });
        filter.category = catDoc._id;
      }
    }

    // ✅ subcategory: slug list -> ids
    if (subcategory.length > 0) {
      const subDocs = await SubCategoryModel.find({
        slug: { $in: subcategory },
      })
        .select("_id")
        .lean();

      const subIds = subDocs.map((d) => d._id);
      if (subIds.length === 0)
        return NextResponse.json({
          success: true,
          items: [],
          total: 0,
          start,
          size,
        });

      filter.subcategory = { $in: subIds };
    }

    if (q) {
      filter.$or = [{ name: { $regex: q, $options: "i" } }];
    }

    const [items, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(size)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .populate("media", "secure_url")
        .populate({
          path: "variants",
          populate: {
            path: "media",
            select: "secure_url",
          },
        })
        .lean(),
      ProductModel.countDocuments(filter),
    ]);

    return NextResponse.json({ success: true, items, total, start, size });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error?.message || "Server error" },
      { status: 500 },
    );
  }
}
