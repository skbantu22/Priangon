import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";
import MediaModel from "@/models/Media.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
import { requireRoles, STAFF_ROLES } from "@/lib/apiAuth";

export async function GET() {
  try {
    const auth = await requireRoles(STAFF_ROLES);
    if (auth.response) return auth.response;

    await connectDB();

    const getProduct = await ProductModel.find({ deletedAt: null })
      .populate("media")
      .populate({
        path: "variants",
        populate: {
          path: "media",
          select: "secure_url",
        },
      })

      .sort({ createdAt: -1 }) // Added sorting to show newest first
      .lean();

    if (!getProduct) {
      return response(false, 404, "Product not found.");
    }

    return response(true, 200, "Product found.", getProduct);
  } catch (error) {
    return catchError(error);
  }
}
