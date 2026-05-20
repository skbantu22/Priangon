import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import ShowroomModel from "@/models/ShowroomProductVariant.model";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import "@/models/Media.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");
    const search = searchParams.get("search") || "";
    const page = Number(searchParams.get("page") || 1);
    const limit = 20;

    // ===============================
    // 1. PRODUCTS
    // ===============================
    const products = await ProductModel.find({
      deletedAt: null,
      name: { $regex: search, $options: "i" },
    })
      .select("name media")
      .populate("media", "secure_url")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const productIds = products.map((p) => p._id);

    // ===============================
    // 2. VARIANTS (OPTIMIZED)
    // ===============================
    const variants = await ProductVariantModel.find({
      product: { $in: productIds },
      deletedAt: null,
      isActive: true,
    })
      .select("product color size media sku barcode mrp sellingPrice")
      .populate("media", "secure_url")
      .lean();

    // ===============================
    // 3. SHOWROOM SELECTED DATA
    // ===============================
    let selectedMap = {};

    if (showroomId) {
      const showroomData = await ShowroomModel.find({
        showroomId,
      }).lean();

      for (const item of showroomData) {
        if (!item.productId) continue;

        selectedMap[item.productId.toString()] = (item.variants || []).map(
          (v) => ({
            variantId: v.variantId?.toString?.() || String(v.variantId),
            stock: Number(v.stock || 0),
          }),
        );
      }
    }

    // ===============================
    // 4. GROUP VARIANTS
    // ===============================
    const variantMap = {};

    for (const v of variants) {
      const pid = v.product.toString();

      if (!variantMap[pid]) variantMap[pid] = [];

      const selected = selectedMap[pid]?.find(
        (x) => x.variantId === v._id.toString(),
      );

      variantMap[pid].push({
        ...v,
        isSelected: !!selected,
        stock: selected?.stock || 0,
      });
    }

    // ===============================
    // 5. FINAL OUTPUT
    // ===============================
    const finalData = products.map((p) => ({
      ...p,
      variants: variantMap[p._id.toString()] || [],
    }));

    return response(true, 200, "Products loaded", finalData);
  } catch (error) {
    console.error("SELECT PRODUCT ERROR:", error);
    return catchError(error);
  }
}
