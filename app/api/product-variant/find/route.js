import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

import MediaModel from "@/models/Media.model";
import WarehouseStock from "@/models/WarehouseStock.model";
import ShowroomStock from "@/models/ShowroomStock";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET(request) {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return response(false, 400, "productId required");
    }

    const data = await ProductVariantModel.find({
      product: productId,
      deletedAt: null,
    })
      .populate("media", "_id secure_url")
      .lean();

    // what is really on hand: warehouse + every showroom
    const ids = data.map((v) => v._id);
    const [wh, sr] = await Promise.all([
      WarehouseStock.find({ variantId: { $in: ids } }).select("variantId stock").lean(),
      ShowroomStock.find({ variantId: { $in: ids } }).select("variantId stock").lean(),
    ]);
    const onHand = new Map();
    for (const s of [...wh, ...sr]) {
      const key = String(s.variantId);
      onHand.set(key, (onHand.get(key) || 0) + (Number(s.stock) || 0));
    }
    for (const v of data) v.liveStock = onHand.get(String(v._id)) || 0;

    return response(true, 200, "Variants fetched", data);
  } catch (error) {
    return catchError(error);
  }
}
