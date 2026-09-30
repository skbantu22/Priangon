import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getPartner, partnerUnauthorized } from "@/lib/partner.server";
import { partnerPrice } from "@/lib/priceTiers";
import { catalogForTill } from "@/lib/tillCatalog";
import Product from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import ShowroomStock from "@/models/ShowroomStock";
import Media from "@/models/Media.model";

const PAGE_SIZE = 24;
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

const emptyPage = (page, showroomId) =>
  NextResponse.json({
    success: true,
    items: [],
    page,
    hasMore: false,
    showroomId: showroomId || "",
    brands: [],
    categories: [],
    subcategories: [],
  });

// GET /api/partner/products?showroomId=&q=&categoryId=&subcategoryId=&brand=&page=
// One price list per login (dealer, sub dealer, or wholesaler). Stock, brands,
// categories, and subcategories are only what that showroom has on the shelf.
// Other buyers' rates never leave the server.
export async function GET(req) {
  const partner = await getPartner();
  if (!partner) return partnerUnauthorized();

  try {
    const sp = new URL(req.url).searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const q = (sp.get("q") || "").trim();
    const categoryId = sp.get("categoryId");
    const subcategoryId = sp.get("subcategoryId");
    const brand = (sp.get("brand") || "").trim();

    const home = partner.user?.showroomId ? String(partner.user.showroomId) : "";
    const asked = sp.get("showroomId") || "";
    const showroomId = home || (isId(asked) ? asked : "");
    if (!showroomId) return emptyPage(page, "");

    const stockRows = await ShowroomStock.find({ showroomId, stock: { $gt: 0 } })
      .select("productId variantId stock")
      .lean();
    const stockMap = new Map(stockRows.map((row) => [String(row.variantId), Number(row.stock) || 0]));
    const productIds = [...new Set(stockRows.map((row) => row.productId).filter(Boolean))];
    const catalog = await catalogForTill(showroomId);

    if (!productIds.length) return emptyPage(page, showroomId);

    const query = { deletedAt: null, _id: { $in: productIds } };
    if (isId(categoryId)) query.category = categoryId;
    if (isId(subcategoryId)) query.subcategory = subcategoryId;
    if (brand) query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    if (q) query.name = { $regex: escapeRegex(q), $options: "i" };

    const products = await Product.find(query)
      .select("name brand category subcategory sellingPrice mrp dealerPrice subDealerPrice wholesalerPrice media variants warranty")
      .sort({ name: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .lean();

    const hasMore = products.length > PAGE_SIZE;
    const list = products.slice(0, PAGE_SIZE);

    const variantIds = list.flatMap((p) => p.variants || []);
    const mediaIds = list.flatMap((p) => (p.media || []).slice(0, 1));

    const [variants, medias] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null, isActive: { $ne: false } })
        .select("product color size mrp sellingPrice dealerPrice subDealerPrice wholesalerPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } }).select("secure_url").lean(),
    ]);

    const mediaMap = new Map(medias.map((m) => [String(m._id), m.secure_url]));
    const byProduct = new Map();
    for (const variant of variants) {
      const key = String(variant.product);
      if (!byProduct.has(key)) byProduct.set(key, []);
      byProduct.get(key).push(variant);
    }

    const items = list
      .map((p) => {
        const image = mediaMap.get(String(p.media?.[0])) || "/placeholder.png";
        const lines = (byProduct.get(String(p._id)) || [])
          .map((v) => ({
            _id: v._id,
            color: v.color,
            size: v.size,
            mrp: v.mrp || v.sellingPrice,
            price: partnerPrice(p, v, partner.type),
            stock: stockMap.get(String(v._id)) || 0,
            image: (typeof v.media?.[0] === "string" && v.media[0]) || image,
          }))
          .filter((line) => line.stock > 0);
        if (!lines.length) return null;
        return {
          _id: p._id,
          name: p.name,
          brand: p.brand || "",
          category: p.category ? String(p.category) : "",
          subcategory: p.subcategory ? String(p.subcategory) : "",
          warranty: p.warranty || { type: "none", months: 0 },
          image,
          variants: lines,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      items,
      page,
      hasMore,
      showroomId,
      partnerType: partner.type,
      brands: catalog.brands,
      categories: catalog.categories,
      subcategories: catalog.subcategories,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
