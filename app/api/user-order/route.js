
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import MediaModel from "@/models/Media.model";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated("user");

    if (!auth?.isAuth) {
      return response(false, 401, "Unauthorized");
    }

    const userId = auth.userId;

    const orders = await OrderModel.find({ userId })
      .sort({ createdAt: -1 })
      .populate("items.productId", "name slug")
      .populate({
        path: "items.variantId",
        populate: { path: "media" },
      })
      .lean();

    const totalOrder = await OrderModel.countDocuments({ userId });

    return response(true, 200, "Order info.", {
      orders
    });
  } catch (error) {
    console.error("Dashboard user API error:", error);
    return catchError(error);
  }
}