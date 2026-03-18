import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import SubCategoryModel from "@/models/subcategory.model";

export async function GET(request) {
  try {
    await connectDB();

    const sp = request.nextUrl.searchParams;

    const start = parseInt(sp.get("start") || "0", 10);
    const size = parseInt(sp.get("size") || "10", 10);
    const globalFilter = sp.get("globalFilter") || "";
    const deleteType = sp.get("deleteType");
    const category = sp.get("category");

    // ✅ Safe sorting parse (avoid 500)
    let sorting = [];
    const sortingRaw = sp.get("sorting");
    if (sortingRaw) {
      try {
        sorting = JSON.parse(sortingRaw);
        if (!Array.isArray(sorting)) sorting = [];
      } catch {
        sorting = [];
      }
    }

    const matchQuery = {};

    if (deleteType === "SD") matchQuery.deletedAt = null;
    else if (deleteType === "PD") matchQuery.deletedAt = { $ne: null };

    // ✅ schema field name is categoryId
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      matchQuery.categoryId = new mongoose.Types.ObjectId(category);
    }

    if (globalFilter) {
      matchQuery.$or = [
        { name: { $regex: globalFilter, $options: "i" } },
        { slug: { $regex: globalFilter, $options: "i" } },
      ];
    }

    const sortQuery = {};
    sorting.forEach((s) => {
      if (s?.id) sortQuery[s.id] = s.desc ? -1 : 1;
    });

    const pipeline = [
      { $match: matchQuery },
      { $sort: Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 } },
      { $skip: start },
      { $limit: size },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          categoryId: 1, // ✅
          createdAt: 1,
          updatedAt: 1,
          deletedAt: 1,
        },
      },
    ];

    const data = await SubCategoryModel.aggregate(pipeline);
    const totalRowCount = await SubCategoryModel.countDocuments(matchQuery);

    return NextResponse.json({ success: true, data, meta: { totalRowCount } });
  } catch (error) {
    console.log("SUBCATEGORY GET ERROR:", error); // ✅ see real reason if still 500
    return catchError(error);
  }
}
