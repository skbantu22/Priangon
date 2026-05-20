import { connectDB } from "@/lib/databaseconnection";

import ShowroomStock from "@/models/ShowroomStock";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Media.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");
    const q = searchParams.get("q") || "";

    // =========================
    // FILTER
    // =========================
    const filter = {
      stock: { $gt: 0 }, // only available stock
    };

    if (showroomId) {
      filter.showroomId = showroomId;
    }

    // =========================
    // FETCH SHOWROOM STOCK
    // =========================
    const data = await ShowroomStock.find(filter)
      .populate({
        path: "productId",
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
        path: "variantId",
        select: "color size sku barcode mrp sellingPrice",
      })
      .lean();

    // =========================
    // REMOVE EMPTY RESULTS
    // =========================
    const filtered = data.filter((item) => item.productId && item.variantId);

    // =========================
    // GROUP BY PRODUCT (FIXED)
    // =========================
    const grouped = {};

    for (const item of filtered) {
      const pid = item.productId._id.toString();
      const vid = item.variantId._id.toString();

      if (!grouped[pid]) {
        grouped[pid] = {
          productId: item.productId,
          variantsMap: new Map(),
        };
      }

      // ✅ prevent duplicate variants
      grouped[pid].variantsMap.set(vid, {
        ...item.variantId,
        showroomStock: item.stock,
      });
    }

    // =========================
    // CONVERT MAP → ARRAY
    // =========================
    const items = Object.values(grouped).map((g) => ({
      productId: g.productId,
      variants: Array.from(g.variantsMap.values()),
    }));

    // =========================
    // DEBUG (optional)
    // =========================
    console.log("SHOWROOM STOCK ITEMS:", items.length);

    if (items.length > 0) {
      console.log("FIRST ITEM:", JSON.stringify(items[0], null, 2));
    }

    // =========================
    // RESPONSE
    // =========================
    return Response.json({
      success: true,
      items,
    });
  } catch (error) {
    console.log("POS API ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 },
    );
  }
}
