import mongoose from "mongoose";
import { NextResponse } from "next/server";

import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import Media from "@/models/Media.model";
import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";
import { connectDB } from "@/lib/databaseconnection";
import { requireRoles, ADMIN_MANAGER } from "@/lib/apiAuth";
import { escapeRegex } from "@/lib/escapeRegex";
import { ratesFor } from "@/lib/priceTiers";

const PAGE = 30;

// Kena product list: name, stock at this showroom, sale price and cost price.
// A scanner works because sku / barcode are matched too.
export async function GET(req) {
  try {
    const auth = await requireRoles(ADMIN_MANAGER);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const showroomId = searchParams.get("showroomId") || "warehouse";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);

    const filter = { deletedAt: null };

    if (q) {
      const pattern = { $regex: escapeRegex(q), $options: "i" };
      const byCode = await ProductVariant.find({ deletedAt: null, $or: [{ sku: pattern }, { barcode: pattern }] })
        .select("product")
        .limit(200)
        .lean();

      filter.$or = [
        { name: pattern },
        { code: pattern },
        { brand: pattern },
        { _id: { $in: byCode.map((row) => row.product).filter(Boolean) } },
      ];
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ name: 1 })
        .skip((page - 1) * PAGE)
        .limit(PAGE)
        .select("name brand unit sellingPrice purchasePrice dealerPrice subDealerPrice wholesalerPrice tierPrices trackSerial media variants")
        .lean(),
    ]);

    const variantIds = products.flatMap((product) => product.variants || []);
    const mediaIds = products.flatMap((product) => (product.media || []).slice(0, 1));

    const stockModel = showroomId === "warehouse" ? WarehouseStock : ShowroomStock;
    const stockFilter =
      showroomId === "warehouse"
        ? { variantId: { $in: variantIds } }
        : { variantId: { $in: variantIds }, showroomId: mongoose.isValidObjectId(showroomId) ? showroomId : null };

    const [variants, mediaDocs, stocks] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null })
        .select("color size sku barcode purchasePrice sellingPrice dealerPrice subDealerPrice wholesalerPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } }).select("secure_url").lean(),
      stockModel.find(stockFilter).select("variantId stock").lean(),
    ]);

    const mediaBy = new Map(mediaDocs.map((doc) => [String(doc._id), doc.secure_url]));
    const stockBy = new Map();
    for (const row of stocks) {
      const key = String(row.variantId);
      stockBy.set(key, (stockBy.get(key) || 0) + (Number(row.stock) || 0));
    }
    const variantBy = new Map(variants.map((variant) => [String(variant._id), variant]));

    const data = [];
    for (const product of products) {
      const image = (product.media || []).map((id) => mediaBy.get(String(id))).find(Boolean) || "";

      for (const id of product.variants || []) {
        const variant = variantBy.get(String(id));
        if (!variant) continue;

        const label = [variant.color, variant.size].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" / ");
        const rates = ratesFor(product, variant);

        data.push({
          variantId: String(variant._id),
          productId: String(product._id),
          name: product.name,
          variantLabel: label,
          brand: product.brand || "",
          unit: product.unit || "Pcs",
          image,
          sku: variant.sku || "",
          barcode: variant.barcode || "",
          stock: stockBy.get(String(variant._id)) || 0,
          sellPrice: rates.sellingPrice,
          // rateForType() on the becha screen reads this name
          sellingPrice: rates.sellingPrice,
          dealerPrice: rates.dealerPrice,
          subDealerPrice: rates.subDealerPrice,
          wholesalerPrice: rates.wholesalerPrice,
          costPrice: Number(variant.purchasePrice) || Number(product.purchasePrice) || 0,
          trackSerial: !!product.trackSerial,
        });
      }
    }

    return NextResponse.json({ success: true, data, page, hasMore: page * PAGE < total });
  } catch (error) {
    console.error("TELEKHATA PRODUCTS ERROR:", error);
    return NextResponse.json({ success: false, message: "Could not load products" }, { status: 500 });
  }
}
