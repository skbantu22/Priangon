import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";
import MediaModel from "@/models/Media.model";
import ProductModel from "@/models/Product.model";
import ProductVariantModel from "@/models/ProductVariant.model ";

export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated();

    if (!auth?.isAuth) {
      return response(false, 401, "Unauthorized");
    }

    const userId = auth.userId;

    console.log("USER ID:", userId);

    const orders = await OrderModel.find({
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return response(true, 200, "Order info.", {
      orders,
    });
  } catch (error) {
    console.log(error);

    return catchError(error);
  }
}
