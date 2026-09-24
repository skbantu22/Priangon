import { NextResponse } from "next/server";
import ProductVariant from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";

/**
 * Product picker for the purchase form. Matches SKU and barcode exactly
 * so a scanner works, and falls back to a name search for typing.
 */
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchingProducts = await ProductModel.find(
      { name: { $regex: escaped, $options: "i" }, deletedAt: null },
      { _id: 1 },
    ).limit(30);

    const variants = await ProductVariant.find({
      deletedAt: null,
      $or: [
        { sku: { $regex: `^${escaped}$`, $options: "i" } },
        { barcode: { $regex: `^${escaped}$`, $options: "i" } },
        { product: { $in: matchingProducts.map((p) => p._id) } },
      ],
    })
      .populate("product", "name unit brand")
      .limit(40);

    const data = variants.map((variant) => ({
      variantId: variant._id,
      productId: variant.product?._id || variant.product,
      productName: variant.product?.name || "",
      brand: variant.product?.brand || "",
      unit: variant.product?.unit || "Pcs",
      variantLabel: [variant.color, variant.size].filter(Boolean).join(" / "),
      sku: variant.sku || "",
      barcode: variant.barcode || "",
      stock: variant.stock || 0,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
