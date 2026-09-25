import { NextResponse } from "next/server";

import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { WAREHOUSE, parseLocation } from "@/lib/stockService";

import ProductVariant from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";

/**
 * Product picker for the adjustment and transfer forms.
 *
 * Matches SKU and barcode exactly so a scanner works, and falls back to
 * a name search for typing. Every row carries what is on hand at the
 * location being worked on, because that is the number that decides
 * whether the line can be sent at all.
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("stock.view");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const location = parseLocation(searchParams.get("location") || "warehouse");

    if (!location) {
      return NextResponse.json(
        { success: false, message: "Unknown location" },
        { status: 400 },
      );
    }

    const escaped = escapeRegex(q);

    const matchingProducts = await ProductModel.find(
      { name: { $regex: escaped, $options: "i" }, deletedAt: null },
      { _id: 1 },
    ).limit(30);

    const variants = await ProductVariant.find({
      deletedAt: null,
      $or: [
        { sku: { $regex: `^${escaped}$`, $options: "i" } },
        { barcode: { $regex: `^${escaped}$`, $options: "i" } },
        { product: { $in: matchingProducts.map((item) => item._id) } },
      ],
    })
      .populate("product", "name")
      .limit(40)
      .lean();

    const variantIds = variants.map((variant) => variant._id);

    // One query for the stock of the whole page of results, rather than
    // one per row
    const stockRows =
      location.locationType === WAREHOUSE
        ? await WarehouseStock.find({ variantId: { $in: variantIds } })
            .select("variantId stock")
            .lean()
        : await ShowroomStock.find({
            showroomId: location.locationId,
            variantId: { $in: variantIds },
          })
            .select("variantId stock")
            .lean();

    const stockByVariant = new Map(
      stockRows.map((row) => [String(row.variantId), Number(row.stock) || 0]),
    );

    const data = variants.map((variant) => ({
      variantId: String(variant._id),
      productId: String(variant.product?._id || variant.product),
      productName: variant.product?.name || "",
      variantLabel:
        [variant.color, variant.size].filter(Boolean).join(" / ") || "Default",
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      stock: stockByVariant.get(String(variant._id)) || 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("INVENTORY VARIANT SEARCH ERROR:", error);

    return NextResponse.json(
      { success: false, message: "Could not search products" },
      { status: 500 },
    );
  }
}
