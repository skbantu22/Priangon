import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";

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

    // ✅ sorting
    let sorting = [];
    try {
      sorting = JSON.parse(sp.get("sorting") || "[]");
    } catch {
      sorting = [];
    }

    // ✅ column filters
    let filters = [];
    try {
      filters = JSON.parse(sp.get("filters") || "[]");
    } catch {
      filters = [];
    }

    const deleteType = sp.get("deleteType");

    // ✅ Base match (delete filter)
    const baseMatch = {};
    if (deleteType === "SD") baseMatch.deletedAt = null;
    else if (deleteType === "PD") baseMatch.deletedAt = { $ne: null };

    // ✅ matchQuery for search + filters
    const matchQuery = {};

    // ✅ Global search (only string fields)
    if (globalFilter) {
      matchQuery.$or = [
        { name: { $regex: globalFilter, $options: "i" } },
        { email: { $regex: globalFilter, $options: "i" } },
        { phone: { $regex: globalFilter, $options: "i" } },
        { address: { $regex: globalFilter, $options: "i" } },
      ];

      // ✅ handle boolean search for verified/unverified
      const gf = globalFilter.toLowerCase();
      if (["verified", "true", "yes", "1"].includes(gf)) {
        matchQuery.$or.push({ isEmailVerified: true });
      }
      if (["not verified", "unverified", "false", "no", "0"].includes(gf)) {
        matchQuery.$or.push({ isEmailVerified: false });
      }
    }

    // ✅ Column filtration
    // expecting: filters = [{ id: "name", value: "abc" }, ...]
    filters.forEach((filter) => {
      if (!filter?.id) return;

      // boolean filter support
      if (filter.id === "isEmailVerified") {
        const v = String(filter.value || "").toLowerCase();
        if (["true", "verified", "yes", "1"].includes(v)) matchQuery.isEmailVerified = true;
        else if (["false", "not verified", "unverified", "no", "0"].includes(v))
          matchQuery.isEmailVerified = false;
        return;
      }

      // normal regex for string fields
      if (filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== "") {
        matchQuery[filter.id] = { $regex: String(filter.value).trim(), $options: "i" };
      }
    });

    // ✅ Sort Query
    const sortQuery = {};
    sorting.forEach((s) => {
      if (!s?.id) return;
      sortQuery[s.id] = s.desc ? -1 : 1;
    });
    const finalSort = Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 };

    // ✅ combine base + matchQuery
    const finalMatch = { ...baseMatch, ...matchQuery };

    const pipeline = [
      { $match: finalMatch },
      {
        $facet: {
          data: [
            { $sort: finalSort },
            { $skip: start },
            { $limit: size },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                phone: 1,
                address: 1,
                avatar: 1,
                isEmailVerified: 1,
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

    const result = await UserModel.aggregate(pipeline);
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