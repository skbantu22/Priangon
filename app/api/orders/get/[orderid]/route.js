import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import MediaModel from "@/models/Media.model";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";
export async function GET(request, { params }) {
  try {
    await connectDB();

    const { orderid } = await params;

    if (!orderid) {
      return response(false, 404, "Order not found.");
    }

    const orderData = await OrderModel.findOne({ orderNumber: orderid })
      .populate("items.productId", "name slug")
      .populate({
        path: "items.variantId",
        populate: { path: "media" },
      })
      .lean();

    if (!orderData) {
      return response(false, 404, "Order not found.");
    }

    return response(true, 200, "Order found.", orderData);
  } catch (error) {
    console.error("Order details API error:", error);
    return catchError(error);
  }
}