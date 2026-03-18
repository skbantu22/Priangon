import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";

export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth?.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const filter = { deletedAt: null };

const getOrder = await OrderModel.find(filter).select("-products").sort({ createdAt: -1 });

    if (!getOrder?.length) {
      return response(false, 404, "Collection empty.", []);
    }

    return response(true, 200, "Data found.", coupons);
  } catch (error) {
    console.log(error)
    return catchError(error);
  }
}