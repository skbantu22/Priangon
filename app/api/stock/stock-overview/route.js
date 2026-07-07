import { connectDB } from "@/lib/databaseconnection";

import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";

import "@/models/Product.model";
import "@/models/ProductVariant.model ";
import "@/models/Showroom.model";
import "@/models/Media.model";
import "@/models/category.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") || "";
    const category = searchParams.get("category") || ""; // ✅ ADDED

    // =========================
    // SEARCH + CATEGORY FILTER
    // =========================
    const productMatch = {
      ...(q && {
        name: { $regex: q, $options: "i" },
      }),
      ...(category && {
        "category.name": category, // or use category slug if needed
      }),
    };

    // =========================
    // SHOWROOM STOCK
    // =========================
    const showroomData = await ShowroomStock.find({})
      .populate({
        path: "showroomId",
        select: "name",
      })
      .populate({
        path: "productId",
        match: productMatch,
        populate: [
          {
            path: "media",
            select: "secure_url",
          },
          {
            path: "category",
            select: "name slug",
          },
        ],
      })
      .populate({
        path: "variantId",
        select: "color size barcode sku sellingPrice",
      })
      .lean();

    // =========================
    // WAREHOUSE STOCK
    // =========================
    const warehouseData = await WarehouseStock.find({})
      .populate({
        path: "productId",
        match: productMatch,
        populate: [
          {
            path: "media",
            select: "secure_url",
          },
          {
            path: "category",
            select: "name slug",
          },
        ],
      })
      .populate({
        path: "variantId",
        select: "color size barcode sku sellingPrice media",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .lean();

    // =========================
    // FILTER INVALID SHOWROOM
    // =========================
    const filteredShowroom = showroomData.filter(
      (item) => item.productId && item.variantId && item.showroomId,
    );

    // =========================
    // FILTER INVALID WAREHOUSE
    // =========================
    const filteredWarehouse = warehouseData.filter(
      (item) => item.productId && item.variantId,
    );

    // =========================
    // GROUP SHOWROOMS
    // =========================
    const grouped = {};

    for (const item of filteredShowroom) {
      const sid = item.showroomId._id.toString();
      const vid = item.variantId._id.toString();

      if (!grouped[sid]) {
        grouped[sid] = {
          _id: sid,
          showroom: item.showroomId.name,
          items: [],
          map: new Map(),
        };
      }

      const key = `${item.productId._id}-${vid}`;

      if (!grouped[sid].map.has(key)) {
        grouped[sid].map.set(key, true);

        grouped[sid].items.push({
          productId: item.productId._id,
          productName: item.productId.name,

          // ✅ CATEGORY ADDED
          category: item.productId.category?.name || "UNCATEGORIZED",

          variantId: vid,
          variant: `${item.variantId.color || "N/A"} - ${
            item.variantId.size || "N/A"
          }`,
          barcode: item.variantId.barcode || "",
          price:
            item.variantId?.sellingPrice ?? item.productId?.sellingPrice ?? 0,
          stock: item.stock || 0,
          image: item.productId.media?.[0]?.secure_url || null,
        });
      }
    }

    // =========================
    // WAREHOUSE ITEMS
    // =========================
    const warehouseItems = [];
    const warehouseMap = new Map();

    for (const item of filteredWarehouse) {
      const vid = item.variantId._id.toString();
      const key = `${item.productId._id}-${vid}`;

      if (!warehouseMap.has(key)) {
        warehouseMap.set(key, true);

        warehouseItems.push({
          productId: item.productId._id,
          productName: item.productId.name,

          // ✅ CATEGORY ADDED
          category: item.productId.category?.name || "UNCATEGORIZED",

          variantId: vid,
          variant: `${item.variantId.color || "N/A"} - ${
            item.variantId.size || "N/A"
          }`,
          barcode: item.variantId.barcode || "",
          price:
            item.variantId?.sellingPrice ?? item.productId?.sellingPrice ?? 0,
          stock: item.stock || 0,
          image: item.productId.media?.[0]?.secure_url || null,
        });
      }
    }

    // =========================
    // FINAL RESULT
    // =========================
    const result = [
      {
        showroom: "Warehouse",
        items: warehouseItems,
      },
      ...Object.values(grouped).map((g) => ({
        _id: g._id,
        showroom: g.showroom,
        items: g.items,
      })),
    ];

    // =========================
    // RESPONSE
    // =========================
    return Response.json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.log("STOCK OVERVIEW ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 },
    );
  }
}
