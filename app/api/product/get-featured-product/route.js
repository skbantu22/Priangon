import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";
import MediaModel from "@/models/Media.model";

export async function GET() {
  try {
    await connectDB();

    const getProduct = await ProductModel.find({ deletedAt: null })
      .populate("media")
      .limit(4)
      .lean();

    if (!getProduct) {
      return response(false, 404, "Product not found.");
    }

    return response(true, 200, "Product found.", getProduct);

  } catch (error) {
    return catchError(error);
  }
}
