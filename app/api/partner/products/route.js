import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { partnerPrice } from "@/lib/priceTiers";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import ShowroomStock from "@/models/ShowroomStock";
import Media from "@/models/Media.model";

const PAGE_SIZE = 24;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/partner/products?q=&categoryId=&brand=&page=
// Catalogue at the partner's own rate with live stock. Purchase price and the
// other buyers' rates never leave the server.
export async function GET(req) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  try {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const q = (sp.get("q") || "").trim();
    const categoryId = sp.get("categoryId");
    const brand = (sp.get("brand") || "").trim();

    const query = { deletedAt: null };
    if (categoryId) query.category = categoryId;
    if (brand) query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    if (q) query.name = { $regex: escapeRegex(q), $options: "i" };

    const products = await Product.find(query)
      .select(
        "name brand category sellingPrice mrp dealerPrice subDealerPrice wholesalerPrice media variants warranty",
      )
      .sort({ name: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .lean();

    const hasMore = products.length > PAGE_SIZE;
    const list = products.slice(0, PAGE_SIZE);

    const variantIds = list.flatMap((p) => p.variants || []);
    const mediaIds = list.flatMap((p) => (p.media || []).slice(0, 1));

    const [variants, medias, stocks] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null, isActive: { $ne: false } })
        .select("product color size mrp sellingPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } }).select("secure_url").lean(),
      ShowroomStock.aggregate([
        { $match: { variantId: { $in: variantIds } } },
        { $group: { _id: "$variantId", stock: { $sum: "$stock" } } },
      ]),
    ]);

    const mediaMap = new Map(medias.map((m) => [String(m._id), m.secure_url]));
    const stockMap = new Map(stocks.map((s) => [String(s._id), Math.max(0, s.stock)]));
    const byProduct = new Map();
    for (const v of variants) {
      const key = String(v.product);
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key).push(v);
    }

    const items = list.map((p) => {
      const image = mediaMap.get(String(p.media?.[0])) || "/placeholder.png";
      return {
        _id: p._id,
        name: p.name,
        brand: p.brand || "",
        category: p.category,
        warranty: p.warranty || { type: "none", months: 0 },
        image,
        variants: (byProduct.get(String(p._id)) || []).map((v) => ({
          _id: v._id,
          color: v.color,
          size: v.size,
          mrp: v.mrp || v.sellingPrice,
          price: partnerPrice(p, v, partner.type),
          stock: stockMap.get(String(v._id)) || 0,
          image: (typeof v.media?.[0] === "string" && v.media[0]) || image,
        })),
      };
    });

    return NextResponse.json({ success: true, items, page, hasMore });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
