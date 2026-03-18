import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import CategoryModel from "@/models/category.model";
import { isAuthenticated } from "@/lib/auth.server";

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const getCategory = await CategoryModel.find({ deletedAt: null })
      .populate({ path: "subcategories", select: "name slug" }) // ✅ if you have subcategories ref

      .sort({ createdAt: -1 })
      .lean();

    if (!getCategory.length) {
      return response(false, 404, "Collection empty.");
    }

    return response(true, 200, "Data found.", getCategory);
  } catch (error) {
    return catchError(error);
  }
}