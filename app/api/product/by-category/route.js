import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";
import CategoryModel from "@/models/category.model";
import SubCategoryModel from "@/models/subcategory.model";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    // ✅ category (required)
    const rawCat = (searchParams.get("category") || "").trim();
    const catSlugOrName = rawCat.toLowerCase();

    // ✅ subcategory (optional) - support multi: ?subcategory=a&subcategory=b
    const subRawList = searchParams
      .getAll("subcategory")
      .map((s) => String(s || "").trim())
      .filter(Boolean);

    // also allow single: ?subcategory=jewellery
    const subSingle = (searchParams.get("subcategory") || "").trim();
    const subList = subRawList.length ? subRawList : (subSingle ? [subSingle] : []);

    const limitRaw = searchParams.get("limit");
    const includeEmpty =
      (searchParams.get("includeEmpty") || "").toLowerCase() === "true";

    const limit = Number.isFinite(Number(limitRaw))
      ? Math.max(parseInt(limitRaw, 10), 0)
      : 0;

    if (!catSlugOrName) {
      return response(false, 400, "Category slug is required. Example: ?category=men");
    }

    // ✅ Find category by slug OR by name (case-insensitive)
    const cat = await CategoryModel.findOne({
      deletedAt: null,
      $or: [
        { slug: catSlugOrName },
        { name: new RegExp(`^${escapeRegex(rawCat)}$`, "i") },
      ],
    })
      .select("_id")
      .lean();

    if (!cat?._id) {
      return response(false, 404, `Category not found: ${rawCat}`);
    }

    // ✅ base category filter (support category OR categoryId)
    const baseFilter = {
      deleteType: null,
      $or: [{ category: cat._id }, { categoryId: cat._id }],
    };

    // ✅ Optional subcategory filter (slug OR name, within this category)
    if (subList.length > 0) {
      const subDocs = await SubCategoryModel.find({
        deletedAt: null,
        categoryId: cat._id, // ✅ ensures subcats belong to this category
        $or: [
          { slug: { $in: subList.map((s) => s.toLowerCase()) } },
          { name: { $in: subList.map((s) => new RegExp(`^${escapeRegex(s)}$`, "i")) } },
        ],
      })
        .select("_id")
        .lean();

      const subIds = subDocs.map((d) => d._id);

      if (subIds.length === 0) {
        if (includeEmpty) return response(true, 200, "No products found.", []);
        return response(false, 404, "Subcategory not found (or no products).");
      }

      // ✅ support subcategory field name: subcategory OR subcategoryId
      baseFilter.$and = [
        {
          $or: [{ subcategory: { $in: subIds } }, { subcategoryId: { $in: subIds } }],
        },
      ];
    }

    // ✅ Query
    let q = ProductModel.find(baseFilter)
      .populate("media")
      .populate("category", "name slug")
      .populate("subcategory", "name slug")
      .populate({
  path: "variants",
  populate: {
    path: "media",
    select: "secure_url"
  }
})
      .lean();

    if (limit > 0) q = q.limit(limit);

    const products = await q;

    if (!products?.length) {
      if (includeEmpty) return response(true, 200, "No products found.", []);
      return response(false, 404, "No products found.");
    }

    return response(true, 200, "Products found.", products);
  } catch (error) {
    console.log("BY-CATEGORY ERROR:", error);
    return catchError(error);
  }
}

// ✅ escape regex special chars
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}