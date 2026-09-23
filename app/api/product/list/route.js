import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import ProductVariant from "@/models/ProductVariant.model ";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import CategoryModel from "@/models/category.model";
import SubCategoryModel from "@/models/subcategory.model";
import Media from "@/models/Media.model";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (v) => !!v && mongoose.Types.ObjectId.isValid(v);

const SORTS = {
  newest: { _id: -1 },
  oldest: { _id: 1 },
  name: { name: 1, _id: 1 },
  "price-asc": { sellingPrice: 1, _id: 1 },
  "price-desc": { sellingPrice: -1, _id: 1 },
};

// Admin product list: one row per product with its variants (barcode, stock,
// prices). ?location = all | warehouse | <showroomId> picks whose stock is shown.
export async function GET(request) {
  try {
    const auth = await isAuthenticated();
    if (!auth.isAuth || !["admin", "manager"].includes(auth.role)) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 403 });
    }

    await connectDB();

    const sp = request.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(5, Number(sp.get("limit")) || 10));
    const q = (sp.get("q") || "").trim();
    const brand = (sp.get("brand") || "").trim();
    const category = sp.get("category");
    const subcategory = sp.get("subcategory");
    const location = sp.get("location") || "all";
    const status = sp.get("status") || "active";
    const web = sp.get("web") || "";
    const sort = SORTS[sp.get("sort")] || SORTS.newest;

    const query = { deletedAt: status === "trash" ? { $ne: null } : null };
    if (brand) query.brand = { $regex: `^${escapeRegex(brand)}$`, $options: "i" };
    if (isId(category)) query.category = category;
    if (isId(subcategory)) query.subcategory = subcategory;
    if (web === "yes") query.showInWebsite = { $ne: false };
    if (web === "no") query.showInWebsite = false;

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

    const [products, total, brands] = await Promise.all([
      ProductModel.find(query)
        .select(
          "name brand category subcategory code unit productType mrp sellingPrice purchasePrice dealerPrice minSalePrice alertQuantity showInWebsite media variants deletedAt",
        )
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(query),
      ProductModel.distinct("brand", { deletedAt: null, brand: { $nin: ["", null] } }),
    ]);

    const variantIds = products.flatMap((p) => p.variants || []);
    const mediaIds = products.map((p) => p.media?.[0]).filter(Boolean);
    const catIds = [...new Set(products.map((p) => String(p.category)).filter(isId))];
    const subIds = [...new Set(products.map((p) => String(p.subcategory)).filter(isId))];

    const stockQuery = { variantId: { $in: variantIds } };
    const wantWarehouse = location === "all" || location === "warehouse";
    const wantShowroom = location !== "warehouse";
    if (isId(location)) stockQuery.showroomId = location;

    const [variants, medias, cats, subs, whStock, srStock] = await Promise.all([
      ProductVariant.find({ _id: { $in: variantIds }, deletedAt: null })
        .select("color size sku barcode mrp sellingPrice media")
        .lean(),
      Media.find({ _id: { $in: mediaIds } }).select("secure_url").lean(),
      CategoryModel.find({ _id: { $in: catIds } }).select("name").lean(),
      SubCategoryModel.find({ _id: { $in: subIds } }).select("name").lean(),
      wantWarehouse
        ? WarehouseStock.find({ variantId: { $in: variantIds } }).select("variantId stock").lean()
        : [],
      wantShowroom ? ShowroomStock.find(stockQuery).select("variantId stock").lean() : [],
    ]);

    const byId = (list) => new Map(list.map((d) => [String(d._id), d]));
    const variantMap = byId(variants);
    const mediaMap = byId(medias);
    const catMap = byId(cats);
    const subMap = byId(subs);

    const stockMap = new Map();
    for (const s of [...whStock, ...srStock]) {
      const key = String(s.variantId);
      stockMap.set(key, (stockMap.get(key) || 0) + (Number(s.stock) || 0));
    }

    const items = products.map((p) => {
      const rows = (p.variants || [])
        .map((id) => variantMap.get(String(id)))
        .filter(Boolean)
        .map((v) => ({
          _id: v._id,
          barcode: v.barcode || "",
          sku: v.sku || "",
          label: [v.color, v.size].filter((x) => x && !/^(default|standard)$/i.test(x)).join(" · "),
          mrp: v.mrp || p.mrp || 0,
          sellingPrice: v.sellingPrice || p.sellingPrice || 0,
          stock: stockMap.get(String(v._id)) || 0,
          image: typeof v.media?.[0] === "string" ? v.media[0] : v.media?.[0]?.secure_url || "",
        }));

      const totalStock = rows.reduce((sum, r) => sum + r.stock, 0);

      return {
        _id: p._id,
        name: p.name,
        code: p.code || "",
        unit: p.unit || "Pcs",
        productType: p.productType || "variant",
        brand: p.brand || "",
        category: catMap.get(String(p.category))?.name || "",
        subcategory: subMap.get(String(p.subcategory))?.name || "",
        image: mediaMap.get(String(p.media?.[0]))?.secure_url || rows[0]?.image || "",
        purchasePrice: p.purchasePrice || 0,
        dealerPrice: p.dealerPrice || 0,
        minSalePrice: p.minSalePrice || 0,
        alertQuantity: p.alertQuantity || 0,
        showInWebsite: p.showInWebsite !== false,
        deleted: !!p.deletedAt,
        variants: rows,
        totalStock,
        lowStock: rows.length > 0 && totalStock <= (p.alertQuantity || 0),
      };
    });

    return NextResponse.json({
      success: true,
      items,
      total,
      page,
      limit,
      brands: brands.sort((a, b) => a.localeCompare(b)),
    });
  } catch (error) {
    console.error("PRODUCT LIST ERROR:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
