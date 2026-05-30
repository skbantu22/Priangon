import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";
import MediaModel from "@/models/Media.model";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 403 },
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

    const baseMatch = {};
    if (deleteType === "SD") baseMatch.deletedAt = null;
    else if (deleteType === "PD") baseMatch.deletedAt = { $ne: null };

    const sortQuery = {};
    sorting.forEach((s) => (sortQuery[s.id] = s.desc ? -1 : 1));

    const finalSort = Object.keys(sortQuery).length
      ? sortQuery
      : { createdAt: -1 };

    const searchMatch = globalFilter
      ? {
          $match: {
            $or: [
              { sku: { $regex: globalFilter, $options: "i" } },
              { color: { $regex: globalFilter, $options: "i" } },
              { size: { $regex: globalFilter, $options: "i" } },
              { "productData.name": { $regex: globalFilter, $options: "i" } },
              {
                $expr: {
                  $regexMatch: {
                    input: { $toString: "$sellingPrice" },
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

      // PRODUCT LOOKUP
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productData",
        },
      },
      {
        $unwind: {
          path: "$productData",
          preserveNullAndEmptyArrays: true,
        },
      },

      // MEDIA LOOKUP (🔥 FIX IMAGE ISSUE)
      {
        $lookup: {
          from: "medias",
          localField: "productData.media",
          foreignField: "_id",
          as: "mediaData",
        },
      },

      {
        $lookup: {
          from: "medias",
          localField: "media",
          foreignField: "_id",
          as: "variantMedia",
        },
      },

      ...(searchMatch ? [searchMatch] : []),

      {
        $facet: {
          data: [
            { $sort: finalSort },
            { $skip: start },
            { $limit: size },

            {
              $project: {
                _id: 1,

                product: {
                  name: "$productData.name",

                  // 🔥 FIRST IMAGE FROM MEDIA ARRAY
                  image: {
                    $let: {
                      vars: {
                        variantImg: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$variantMedia",
                                as: "m",
                                in: "$$m.secure_url",
                              },
                            },
                            0,
                          ],
                        },
                        productImg: {
                          $arrayElemAt: [
                            {
                              $map: {
                                input: "$mediaData",
                                as: "m",
                                in: "$$m.secure_url",
                              },
                            },
                            0,
                          ],
                        },
                      },
                      in: {
                        $ifNull: ["$$variantImg", "$$productImg"],
                      },
                    },
                  },
                },

                sku: 1,
                color: 1,
                size: 1,
                mrp: 1,
                sellingPrice: 1,
                discountPercentage: 1,
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

    const result = await ProductVariantModel.aggregate(pipeline);
    const data = result?.[0]?.data || [];
    const totalRowCount = result?.[0]?.total?.[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data,
      meta: { totalRowCount },
    });
  } catch (error) {
    console.error("Error fetching product variants:", error);
    return catchError(error);
  }
}
