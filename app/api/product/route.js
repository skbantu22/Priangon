import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 }
      );
    }

    await connectDB();

    const sp = request.nextUrl.searchParams;

    const start = parseInt(sp.get("start") || "0", 10);
    const size = parseInt(sp.get("size") || "10", 10);
    const globalFilter = (sp.get("globalFilter") || "").trim();

    let sorting = [];
    try {
      sorting = JSON.parse(sp.get("sorting") || "[]");
    } catch {
      sorting = [];
    }

    const deleteType = sp.get("deleteType");

    // ✅ Base match (only fields that exist in Product)
    const baseMatch = {};
    if (deleteType === "SD") baseMatch.deletedAt = null;
    else if (deleteType === "PD") baseMatch.deletedAt = { $ne: null };

    // ✅ Sort Query
    const sortQuery = {};
    sorting.forEach((s) => (sortQuery[s.id] = s.desc ? -1 : 1));
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // ✅ Global filter match (AFTER lookup/unwind, because categoryData exists then)
    const searchMatch =
      globalFilter
        ? {
            $match: {
              $or: [
                { name: { $regex: globalFilter, $options: "i" } },
                { slug: { $regex: globalFilter, $options: "i" } },
                { "categoryData.name": { $regex: globalFilter, $options: "i" } },

                // numeric field search (mrp) by converting to string
                {
                  $expr: {
                    $regexMatch: {
                      input: { $toString: "$mrp" },
                      regex: globalFilter,
                      options: "i",
                    },
                  },
                },
                     {
                  $expr: {
                    $regexMatch: {
                      input: { $toString: "$sellingPrice" },
                      regex: globalFilter,
                      options: "i",
                    },
                  },
                },
                  {
                  $expr: {
                    $regexMatch: {
                      input: { $toString: "$discountPercentage" },
                      regex: globalFilter,
                      options: "i",
                    },
                  },
                },




              ],
            },
          }
        : null;

    const pipeline = [
      { $match: baseMatch },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryData",
        },
      },
      {
        $unwind: {
          path: "$categoryData",
          preserveNullAndEmptyArrays: true,
        },
      },

      ...(searchMatch ? [searchMatch] : []),

      // ✅ return both data + total count correctly
      {
        $facet: {
          data: [
            { $sort: finalSort },
            { $skip: start },
            { $limit: size },
            {
              $project: {
                name: 1,
                slug: 1,
                mrp: 1,
                sellingPrice: 1,
                discountPercentage: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1,
                category: "$categoryData.name",
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await ProductModel.aggregate(pipeline);
    const data = result?.[0]?.data || [];
    const totalRowCount = result?.[0]?.total?.[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data,
      meta: { totalRowCount },
    });
  } catch (error) {
    return catchError(error);
  }
}