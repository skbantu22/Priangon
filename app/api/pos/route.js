import { connectDB } from "@/lib/databaseconnection";
import ShowroomProduct from "@/models/ShowroomProductVariant.model";

import "@/models/Product.model";
import "@/models/Media.model";
import "@/models/ProductVariant.model ";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    // ---------------- QUERY PARAMS ----------------
    const showroomId = searchParams.get("showroomId");

    const q = searchParams.get("q") || "";

    // ---------------- FILTER ----------------
    const filter = {};

    // showroom user only
    if (showroomId) {
      filter.showroomId = showroomId;
    }

    // ---------------- FETCH PRODUCTS ----------------
    const data = await ShowroomProduct.find(filter)
      .populate({
        path: "productId",

        // search by product name
        match: q
          ? {
              name: {
                $regex: q,
                $options: "i",
              },
            }
          : {},

        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .populate({
        path: "variants.variantId",

        select: "color size stock sellingPrice barcode",
      })
      .lean();

    // ---------------- REMOVE EMPTY PRODUCTS ----------------
    const filtered = data.filter((item) => item.productId);

    // IMPORTANT:
    // DO NOT REMOVE DUPLICATES
    // because admin must see all showroom stock

    const total = await ShowroomProduct.countDocuments({});
    console.log("TOTAL SHOWROOM PRODUCTS IN DB:", total);

    const sample = await ShowroomProduct.findOne({}).lean();
    console.log("RAW DATA LENGTH:", data.length);
    console.log("FIRST ITEM productId:", data[0]?.productId);
    console.log("FILTERED LENGTH:", filtered.length);
    console.log("SAMPLE DOC:", JSON.stringify(sample, null, 2));

    return Response.json({
      success: true,

      items: filtered,
    });
  } catch (error) {
    console.log("POS API ERROR:", error);

    return Response.json(
      {
        success: false,

        message: "Server Error",
      },
      {
        status: 500,
      },
    );
  }
}
