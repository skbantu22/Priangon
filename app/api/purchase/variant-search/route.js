import { NextResponse } from "next/server";
import ProductVariant from "@/models/ProductVariant.model ";
import ProductModel from "@/models/Product.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { connectDB } from "@/lib/databaseconnection";
import { requireAnyPermission } from "@/lib/apiAuth";
import { ratesFor } from "@/lib/priceTiers";

/**
 * Product picker for the purchase form. Matches SKU and barcode exactly
 * so a scanner works, and falls back to a name search for typing. Each
 * hit carries its stock on hand, its last cost and the four sale rates,
 * so the form can show the margin a new purchase price leaves.
 */
export async function GET(req) {
  try {
    const auth = await requireAnyPermission(["purchase.create", "purchase.order", "purchase.return"]);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const matchingProducts = await ProductModel.find(
      {
        deletedAt: null,
        $or: [{ name: { $regex: escaped, $options: "i" } }, { code: { $regex: `^${escaped}$`, $options: "i" } }],
      },
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
      .populate(
        "product",
        "name unit brand trackSerial deletedAt sellingPrice purchasePrice dealerPrice subDealerPrice wholesalerPrice",
      )
      .limit(40)
      .lean();

    const live = variants.filter((v) => v.product && !v.product.deletedAt);
    const ids = live.map((v) => v._id);

    const [wh, sr] = await Promise.all([
      WarehouseStock.find({ variantId: { $in: ids } }).select("variantId stock").lean(),
      ShowroomStock.find({ variantId: { $in: ids } }).select("variantId stock").lean(),
    ]);
    const onHand = new Map();
    for (const s of [...wh, ...sr]) {
      const key = String(s.variantId);
      onHand.set(key, (onHand.get(key) || 0) + (Number(s.stock) || 0));
    }

    const data = live.map((variant) => {
      const product = variant.product;
      return {
        variantId: variant._id,
        productId: product._id,
        productName: product.name || "",
        brand: product.brand || "",
        unit: product.unit || "Pcs",
        variantLabel: [variant.color, variant.size]
          .filter((x) => x && !/^(default|standard)$/i.test(x))
          .join(" / "),
        sku: variant.sku || "",
        barcode: variant.barcode || "",
        stock: onHand.get(String(variant._id)) || 0,
        lastCost: Number(variant.purchasePrice) || Number(product.purchasePrice) || 0,
        trackSerial: !!product.trackSerial,
        rates: ratesFor(product, variant),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
