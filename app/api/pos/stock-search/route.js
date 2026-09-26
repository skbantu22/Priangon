import mongoose from "mongoose";
import { NextResponse } from "next/server";

import ShowroomStock from "@/models/ShowroomStock";
import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import { connectDB } from "@/lib/databaseconnection";
import { requirePermission } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";

/**
 * GET ?showroomId&q — what the exchange screen can give out: stock rows of
 * the branch with the product and variant filled in, matched by name,
 * SKU or barcode. (The screen asked a route that never existed.)
 */
export async function GET(req) {
  try {
    const auth = await requirePermission("pos.exchange");
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const showroomId = searchParams.get("showroomId");
    const q = String(searchParams.get("q") || "").trim();

    if (!mongoose.isValidObjectId(showroomId) || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const regex = { $regex: escapeRegex(q), $options: "i" };
    const products = await ProductModel.find({ deletedAt: null, $or: [{ name: regex }, { code: regex }] })
      .select("_id")
      .limit(40)
      .lean();

    const variants = await ProductVariant.find({
      deletedAt: null,
      $or: [{ sku: regex }, { barcode: regex }, { product: { $in: products.map((p) => p._id) } }],
    })
      .select("_id")
      .limit(80)
      .lean();

    const rows = await ShowroomStock.find({
      showroomId,
      variantId: { $in: variants.map((v) => v._id) },
      stock: { $gt: 0 },
    })
      .populate("productId", "name sellingPrice")
      .populate("variantId", "color size sku barcode sellingPrice")
      .limit(40)
      .lean();

    // a variant priced from its product shows the product's price
    const data = rows
      .filter((row) => row.productId && row.variantId)
      .map((row) => ({
        ...row,
        variantId: {
          ...row.variantId,
          sellingPrice: row.variantId.sellingPrice || row.productId.sellingPrice || 0,
          stock: row.stock,
        },
      }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
