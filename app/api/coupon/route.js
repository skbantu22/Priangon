import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import CouponModel from "@/models/Coupon.model";

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

    // ✅ Base match
    const baseMatch = {};
    if (deleteType === "SD") baseMatch.deletedAt = null;
    else if (deleteType === "PD") baseMatch.deletedAt = { $ne: null };

    // ✅ Sort Query
    const sortQuery = {};
    sorting.forEach((s) => (sortQuery[s.id] = s.desc ? -1 : 1));
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // ✅ Global filter match
    const searchMatch = globalFilter
      ? {
          $match: {
            $or: [
              { code: { $regex: globalFilter, $options: "i" } },

              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$minShoppingAmount" },
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
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$validity" },
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
      ...(searchMatch ? [searchMatch] : []),

      // ✅ data + total count
      {
        $facet: {
          data: [
            { $sort: finalSort },
            { $skip: start },
            { $limit: size },
            {
              $project: {
                code: 1,
                discountPercentage: 1,
                minShoppingAmount: 1,
                validity: 1,
                createdAt: 1,
                updatedAt: 1,
                deletedAt: 1,
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ];

    const result = await CouponModel.aggregate(pipeline);
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