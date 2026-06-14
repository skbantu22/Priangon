import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import ProductVariantModel from "@/models/ProductVariant.model ";

import MediaModel from "@/models/Media.model";

export async function GET(request) {
  try {
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

    return response(true, 200, "Variants fetched", data);
  } catch (error) {
    return catchError(error);
  }
}
