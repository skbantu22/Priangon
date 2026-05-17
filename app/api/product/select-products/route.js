import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import ShowroomModel from "@/models/ShowroomProductVariant.model";
import { connectDB } from "@/lib/databaseconnection";
import "@/models/Media.model";
import { response, catchError } from "@/lib/helperfunction";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = 20;

    // ---------------- PRODUCTS ----------------
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

    // ---------------- VARIANTS ----------------
    const variants = await ProductVariantModel.find({
      product: { $in: productIds },
      deletedAt: null,
    })
      .select("product color size media")
      .populate("media", "secure_url")
      .lean();

    // ---------------- SHOWROOM DATA ----------------
    let selectedMap = {};

    if (showroomId) {
      const showroomData = await ShowroomModel.find({
        showroomId,
      }).lean();

      showroomData.forEach((item) => {
        selectedMap[item.productId.toString()] = (item.variants || []).map(
          (v) => ({
            variantId: v.variantId.toString(),
            stock: Number(v.stock || 0),
          }),
        );
      });
    }

    // ---------------- GROUP VARIANTS ----------------
    const variantMap = {};

    variants.forEach((v) => {
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
    });

    // ---------------- FINAL RESPONSE ----------------
    const finalData = products.map((p) => ({
      ...p,
      variants: variantMap[p._id.toString()] || [],
    }));

    return response(true, 200, "OK", finalData);
  } catch (error) {
    console.error("GET /api/product/select-products ERROR:", error);
    return catchError(error);
  }
}
