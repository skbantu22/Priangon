import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import { isValidObjectId } from "mongoose";
import ProductModel from "@/models/Product.model";
import SubCategoryModel from "@/models/subcategory.model";
import MediaModel from "@/models/Media.model";

export async function GET(request, context) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth?.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    // ✅ robust: works even if params is promise-like
    const params = await context?.params;
    const id = String(params?.id || "").trim();

    console.log("id:", id);

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid object id.");
    }

    const data = await ProductModel.findOne({ _id: id, deletedAt: null })
      .populate("media", "_id secure_url")
      .populate("subcategory", "name")
      .lean();

    if (!data) return response(false, 404, "Category not found.");

    return response(true, 200, "Category found.", data);
  } catch (error) {
    console.error("PRODUCT GET ERROR:");
    console.error(error);
    return catchError(error);
  }
}
