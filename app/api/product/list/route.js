import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import CategoryModel from "@/models/category.model";
import Media from "@/models/Media.model";
import { ratesFor } from "@/lib/priceTiers";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (v) => !!v && mongoose.Types.ObjectId.isValid(v);

const TIERS = ["dealerPrice", "subDealerPrice", "wholesalerPrice"];

const SORTS = {
  newest: (a, b) => (String(b._id) > String(a._id) ? 1 : -1),
  oldest: (a, b) => (String(a._id) > String(b._id) ? 1 : -1),
  name: (a, b) => a.name.localeCompare(b.name),
  "stock-desc": (a, b) => b.totalStock - a.totalStock,
  "stock-asc": (a, b) => a.totalStock - b.totalStock,
  "value-desc": (a, b) => b.stockValue - a.stockValue,
  "price-asc": (a, b) => (a.variants[0]?.sellingPrice || 0) - (b.variants[0]?.sellingPrice || 0),
  "price-desc": (a, b) => (b.variants[0]?.sellingPrice || 0) - (a.variants[0]?.sellingPrice || 0),
};

// Stock tabs; "issue" = a dealer tier rate is not set (POS charges retail)
// or some rate sells at or below cost
const STOCK_FILTERS = {
  in: (p) => p.totalStock > 0 && !p.lowStock,
  low: (p) => p.lowStock && p.totalStock > 0,
  out: (p) => p.totalStock <= 0,
  issue: (p) => p.missingTier || p.lossTier,
};

// Admin product list, one row per product with its variants. Every variant
// carries the rate each buyer type pays at the POS and its cost, so the list
// shows the margin per tier. ?location = all | warehouse | <showroomId>.
export async function GET(request) {
  try {
    const auth = await isAuthenticated();
    if (!auth.isAuth || !["admin", "manager"].includes(auth.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = sp.get("limit") === "all" ? 5000 : Math.min(100, Math.max(5, Number(sp.get("limit")) || 20));
    const q = (sp.get("q") || "").trim();
    const brand = (sp.get("brand") || "").trim();
    const category = sp.get("category");
    const location = sp.get("location") || "all";
    const status = sp.get("status") || "active";
    const stockFilter = STOCK_FILTERS[sp.get("stock")] || null;
    const sort = SORTS[sp.get("sort")] || SORTS.newest;

    const query = { deletedAt: status === "trash" ? { $ne: null } : null };
    if (brand) query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    if (isId(category)) query.category = category;

    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      const matched = await ProductVariant.find({ $or: [{ barcode: rx }, { sku: rx }] })
        .select("product")
        .lean();
      query.$or = [
        { name: rx },
        { code: rx },
        { _id: { $in: matched.map((v) => v.product).filter(Boolean) } },
      ];
    }

    // Tabs, totals and stock sorts need every matching product, so the page
    // is cut after the rows are built
    const [products, brands] = await Promise.all([
      ProductModel.find(query)
        .select(
          "name brand category code unit mrp sellingPrice purchasePrice dealerPrice subDealerPrice wholesalerPrice minSalePrice alertQuantity media variants deletedAt",
        )
        .lean(),
      ProductModel.distinct("brand", { deletedAt: null, brand: { $nin: ["", null] } }),
    ]);

    const variantIds = products.flatMap((p) => p.variants || []);
    const catIds = [...new Set(products.map((p) => String(p.category)).filter(isId))];

    const wantWarehouse = location === "all" || location === "warehouse";
    const wantShowroom = location !== "warehouse";
    const showroomQuery = { variantId: { $in: variantIds } };
    if (isId(location)) showroomQuery.showroomId = location;

    const [variants, cats, whStock, srStock] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null })
        .select("color size sku barcode mrp sellingPrice purchasePrice")
        .lean(),
      CategoryModel.find({ _id: { $in: catIds } }).select("name").lean(),
      wantWarehouse
        ? WarehouseStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean()
        : [],
      wantShowroom ? ShowroomStock.find(showroomQuery).select("variantId stock").lean() : [],
    ]);

    const byId = (list) => new Map(list.map((d) => [String(d._id), d]));
    const variantMap = byId(variants);
    const catMap = byId(cats);

    const stockMap = new Map();
    for (const s of [...whStock, ...srStock]) {
      const key = String(s.variantId);
      stockMap.set(key, (stockMap.get(key) || 0) + (Number(s.stock) || 0));
    }

    let rows = products.map((p) => {
      const lines = (p.variants || [])
        .map((id) => variantMap.get(String(id)))
        .filter(Boolean)
        .map((v) => {
          const rates = ratesFor(p, v);
          return {
            _id: v._id,
            barcode: v.barcode || v.sku || "",
            label: [v.color, v.size].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" · "),
            stock: stockMap.get(String(v._id)) || 0,
            cost: Number(v.purchasePrice) || Number(p.purchasePrice) || 0,
            mrp: Number(v.mrp) || Number(p.mrp) || 0,
            ...rates,
          };
        });

      const totalStock = lines.reduce((sum, l) => sum + l.stock, 0);
      const missingTier = TIERS.some((f) => !p[f]);
      const lossTier = lines.some(
        (l) => l.cost > 0 && ["sellingPrice", ...TIERS].some((f) => l[f] > 0 && l[f] <= l.cost),
      );

      return {
        _id: p._id,
        name: p.name,
        code: p.code || "",
        unit: p.unit || "Pcs",
        brand: p.brand || "",
        category: catMap.get(String(p.category))?.name || "",
        media: p.media?.[0] || null,
        minSalePrice: p.minSalePrice || 0,
        alertQuantity: p.alertQuantity || 0,
        deleted: !!p.deletedAt,
        variants: lines,
        totalStock,
        stockValue: lines.reduce((sum, l) => sum + l.stock * l.cost, 0),
        lowStock: lines.length > 0 && totalStock <= (p.alertQuantity || 0),
        missingTier,
        lossTier,
      };
    });

    const counts = {
      all: rows.length,
      ...Object.fromEntries(Object.entries(STOCK_FILTERS).map(([key, fn]) => [key, rows.filter(fn).length])),
    };

    if (stockFilter) rows = rows.filter(stockFilter);
    rows.sort(sort);

    // What the stock in view is worth, and the profit if all of it went to
    // one kind of buyer (a rate that is not set falls back to retail)
    const totals = { stock: 0, cost: 0, retail: 0, dealer: 0, subDealer: 0, wholesaler: 0 };
    for (const r of rows) {
      for (const l of r.variants) {
        totals.stock += l.stock;
        totals.cost += l.stock * l.cost;
        totals.retail += l.stock * l.sellingPrice;
        totals.dealer += l.stock * (l.dealerPrice || l.sellingPrice);
        totals.subDealer += l.stock * (l.subDealerPrice || l.sellingPrice);
        totals.wholesaler += l.stock * (l.wholesalerPrice || l.sellingPrice);
      }
    }

    const total = rows.length;
    const from = (page - 1) * limit;
    const items = rows.slice(from, from + limit);

    // pictures only for the rows on this page
    const medias = await Media.find({ _id: { $in: items.map((r) => r.media).filter(isId) } })
      .select("secure_url")
      .lean();
    const mediaMap = byId(medias);
    for (const item of items) {
      item.image = mediaMap.get(String(item.media))?.secure_url || "";
      delete item.media;
    }

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
      from: total ? from + 1 : 0,
      pages: Math.max(1, Math.ceil(total / limit)),
      counts,
      totals,
      brands: brands.sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    console.error("PRODUCT LIST ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
