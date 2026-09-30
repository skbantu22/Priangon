import mongoose from "mongoose";
import Product from "@/models/Product.model";
import Category from "@/models/category.model";
import SubCategory from "@/models/subcategory.model";
import ShowroomStock from "@/models/ShowroomStock";
import WarehouseStock from "@/models/WarehouseStock.model";

const isId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));

/** Product ids that actually have quantity at this till. */
async function stockedProductIds(showroomId) {
  const id = String(showroomId || "");

  if (id === "all") {
    const [warehouse, showrooms] = await Promise.all([
      WarehouseStock.find({ stock: { $gt: 0 } }).select("productId").lean(),
      ShowroomStock.find({ stock: { $gt: 0 } }).select("productId").lean(),
    ]);
    return [...new Set([...warehouse, ...showrooms].map((row) => row.productId).filter(Boolean))];
  }

  if (id === "warehouse") {
    const rows = await WarehouseStock.find({ stock: { $gt: 0 } }).select("productId").lean();
    return [...new Set(rows.map((row) => row.productId).filter(Boolean))];
  }

  if (!isId(id)) return [];

  const rows = await ShowroomStock.find({ showroomId: id, stock: { $gt: 0 } })
    .select("productId")
    .lean();
  return [...new Set(rows.map((row) => row.productId).filter(Boolean))];
}

const empty = () => ({ brands: [], categories: [], subcategories: [] });

/**
 * Brands, categories, and subcategories of products added (in stock) at one
 * showroom. Nothing from the master catalog or another till.
 */
export async function catalogForTill(showroomId) {
  const productIds = await stockedProductIds(showroomId);
  if (!productIds.length) return empty();

  const products = await Product.find({
    _id: { $in: productIds },
    deletedAt: null,
  })
    .select("brand category subcategory")
    .lean();

  if (!products.length) return empty();

  const brandByKey = new Map();
  for (const product of products) {
    const name = String(product.brand || "").trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!brandByKey.has(key)) brandByKey.set(key, name);
  }

  const catIds = [...new Set(products.map((product) => String(product.category || "")).filter(isId))];
  const subIds = [...new Set(products.map((product) => String(product.subcategory || "")).filter(isId))];

  const [categories, subcategories] = await Promise.all([
    catIds.length
      ? Category.find({ _id: { $in: catIds }, deletedAt: null }).select("name").sort({ name: 1 }).lean()
      : [],
    subIds.length
      ? SubCategory.find({ _id: { $in: subIds }, deletedAt: null })
          .select("name categoryId")
          .sort({ name: 1 })
          .lean()
      : [],
  ]);

  return {
    brands: [...brandByKey.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })),
    categories: categories.map((row) => ({ _id: String(row._id), name: row.name || "" })),
    subcategories: subcategories.map((row) => ({
      _id: String(row._id),
      name: row.name || "",
      categoryId: row.categoryId ? String(row.categoryId) : "",
    })),
  };
}
